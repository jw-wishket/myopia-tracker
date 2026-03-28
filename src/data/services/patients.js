import { supabase } from '../supabaseClient.js';
import { calcAge, calcPct } from '../../utils.js';
import { escapeLike, toPatientJS, fetchPatientFull, logAudit } from './helpers.js';

export async function getPatients(clinicId) {
  let query = supabase.from('patients').select('*');
  if (clinicId) query = query.eq('clinic_id', clinicId);
  const { data, error } = await query.order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}

export async function getRecentPatients(clinicId, limit = 10) {
  // Get patient IDs for this clinic first
  const { data: clinicPatientIds } = await supabase
    .from('patients')
    .select('id')
    .eq('clinic_id', clinicId);

  if (!clinicPatientIds || clinicPatientIds.length === 0) {
    return [];
  }

  const ids = clinicPatientIds.map(p => p.id);

  const { data: recentMeasurements } = await supabase
    .from('measurements')
    .select('patient_id, date')
    .in('patient_id', ids)
    .order('date', { ascending: false });

  if (!recentMeasurements || recentMeasurements.length === 0) {
    const { data } = await supabase.from('patients').select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!data || data.length === 0) return [];
    return Promise.all(data.map(p => fetchPatientFull(p)));
  }

  const seen = new Set();
  const recentIds = [];
  for (const m of recentMeasurements) {
    if (!seen.has(m.patient_id)) {
      seen.add(m.patient_id);
      recentIds.push(m.patient_id);
      if (recentIds.length >= limit) break;
    }
  }

  const { data } = await supabase.from('patients').select('*')
    .eq('clinic_id', clinicId)
    .in('id', recentIds);

  if (!data) return [];

  const patientMap = {};
  data.forEach(p => { patientMap[p.id] = p; });
  const orderedRows = recentIds.map(id => patientMap[id]).filter(Boolean);
  return Promise.all(orderedRows.map(p => fetchPatientFull(p)));
}

export async function searchPatientsLight(query, clinicId) {
  const { data } = await supabase.from('patients').select('id, name, birth_date, gender, custom_ref')
    .eq('clinic_id', clinicId)
    .or(`name.ilike.%${escapeLike(query)}%,custom_ref.ilike.%${escapeLike(query)}%`)
    .order('name')
    .limit(20);
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    gender: p.gender, customRef: p.custom_ref,
  }));
}

export async function getPatientCount(clinicId) {
  const { count } = await supabase.from('patients').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId);
  return count || 0;
}

export async function getPatientById(id) {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
  if (error || !data) return null;
  return fetchPatientFull(data);
}

export async function searchPatients(query, clinicId) {
  let q = supabase.from('patients').select('*').or(`name.ilike.%${escapeLike(query)}%,custom_ref.ilike.%${escapeLike(query)}%`);
  if (clinicId) q = q.eq('clinic_id', clinicId);
  const { data, error } = await q.order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}

export async function searchPatientByInfo(name, birthDate, customRef, clinicId) {
  const { data, error } = await supabase.rpc('search_patient_public', {
    p_name: name,
    p_birth_date: birthDate || null,
    p_clinic_id: clinicId,
    p_custom_ref: customRef || null,
  });
  if (error || !data) return null;

  // Convert RPC result to JS format
  return {
    id: data.id,
    name: data.name,
    birthDate: data.birth_date,
    gender: data.gender,
    regNo: data.reg_no,
    customRef: data.custom_ref,
    clinicId: data.clinic_id,
    records: (data.measurements || []).map(m => ({
      id: m.id, date: m.date, age: parseFloat(m.age),
      odAL: parseFloat(m.od_al), osAL: parseFloat(m.os_al),
      odSE: m.od_se != null ? parseFloat(m.od_se) : null,
      osSE: m.os_se != null ? parseFloat(m.os_se) : null,
      odPct: m.od_pct, osPct: m.os_pct,
    })),
    treatments: (data.treatments || []).map(t => ({
      id: t.id, type: t.type, date: t.date,
      age: parseFloat(t.age), endDate: t.end_date,
    })),
  };
}

export async function addPatient(patient) {
  // Check duplicate
  const { data: existing } = await supabase.from('patients')
    .select('id, name')
    .eq('clinic_id', patient.clinicId)
    .eq('name', patient.name)
    .eq('birth_date', patient.birthDate);
  if (existing && existing.length > 0) {
    return { error: '같은 이름과 생년월일의 환자가 이미 등록되어 있습니다.' };
  }

  // Check duplicate custom_ref in same clinic
  if (patient.customRef) {
    const { data: existingRef } = await supabase.from('patients')
      .select('id')
      .eq('clinic_id', patient.clinicId)
      .eq('custom_ref', patient.customRef);
    if (existingRef && existingRef.length > 0) {
      return { error: '같은 관리번호가 이미 사용 중입니다.' };
    }
  }

  const regNo = 'P-' + Date.now();
  const { data, error } = await supabase.from('patients').insert({
    name: patient.name,
    birth_date: patient.birthDate,
    gender: patient.gender,
    reg_no: regNo,
    clinic_id: patient.clinicId,
    custom_ref: patient.customRef || null,
  }).select().single();
  if (error) { console.error('addPatient error:', error); return null; }
  await logAudit('create', 'patient', data.id);
  return toPatientJS(data, [], []);
}

export async function deletePatient(id) {
  await supabase.from('patients').delete().eq('id', id);
  await logAudit('delete', 'patient', id);
}

export async function updatePatient(id, updates) {
  // Check custom_ref uniqueness if being updated
  if (updates.customRef !== undefined && updates.customRef) {
    const { data: patient } = await supabase.from('patients').select('clinic_id').eq('id', id).single();
    if (patient) {
      const { data: existing } = await supabase.from('patients')
        .select('id')
        .eq('clinic_id', patient.clinic_id)
        .eq('custom_ref', updates.customRef)
        .neq('id', id);
      if (existing && existing.length > 0) {
        return { error: '같은 관리번호가 이미 사용 중입니다.' };
      }
    }
  }

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
  if (updates.customRef !== undefined) dbUpdates.custom_ref = updates.customRef;
  if (updates.nextVisitDate !== undefined) dbUpdates.next_visit_date = updates.nextVisitDate;
  if (updates.followUpMonths !== undefined) dbUpdates.follow_up_months = updates.followUpMonths;
  const { error } = await supabase.from('patients').update(dbUpdates).eq('id', id);
  if (error) { console.error('updatePatient error:', error); return false; }
  await logAudit('update', 'patient', id, updates);
  return true;
}

export async function getOverduePatients(clinicId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .lt('next_visit_date', today)
    .order('next_visit_date');
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    nextVisitDate: p.next_visit_date, customRef: p.custom_ref,
  }));
}

export async function exportClinicData(clinicId) {
  const patients = await getPatients(clinicId);
  let csv = '\ufeff환자명,생년월일,성별,관리번호,측정일,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct,치료\n';
  for (const p of patients) {
    const treatmentStr = (p.treatments || []).map(t => `${t.type}(${t.date}${t.endDate ? '~' + t.endDate : ''})`).join('; ');
    if (p.records && p.records.length > 0) {
      for (const r of p.records) {
        csv += `${p.name},${p.birthDate},${p.gender === 'male' ? '남' : '여'},${p.customRef || ''},${r.date},${r.age},${r.odAL},${r.osAL},${r.odSE ?? ''},${r.osSE ?? ''},${r.odPct ?? ''},${r.osPct ?? ''},${treatmentStr}\n`;
      }
    } else {
      csv += `${p.name},${p.birthDate},${p.gender === 'male' ? '남' : '여'},${p.customRef || ''},,,,,,,,${treatmentStr}\n`;
    }
  }
  return csv;
}
