import { supabase } from '../supabaseClient.js';
import { calcAge, calcPct } from '../../utils.js';
import { escapeLike, toPatientJS, fetchPatientFull, logAudit, firstDistinctPatientIds, groupByPatientId } from './helpers.js';
import { getCachedPatient, setCachedPatient, invalidatePatient } from '../patientCache.js';

export async function getPatients() {
  const { data, error } = await supabase.from('patients').select('*').order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}

export async function getRecentPatients(_clinicId, limit = 10) {
  // 전체 테이블이 아닌 최근 500행만 — 환자 limit명을 찾기에 충분하고 데이터 증가에도 비용 고정
  const { data: recentMeasurements } = await supabase
    .from('measurements')
    .select('patient_id, date')
    .order('date', { ascending: false })
    .limit(500);

  if (!recentMeasurements || recentMeasurements.length === 0) {
    const { data } = await supabase.from('patients').select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!data || data.length === 0) return [];
    return fetchPatientsFullBatch(data);
  }

  const recentIds = firstDistinctPatientIds(recentMeasurements, limit);

  const { data } = await supabase.from('patients').select('*').in('id', recentIds);
  if (!data) return [];
  const patientMap = {};
  data.forEach(p => { patientMap[p.id] = p; });
  const orderedRows = recentIds.map(id => patientMap[id]).filter(Boolean);
  return fetchPatientsFullBatch(orderedRows);
}

// 환자별 2요청(측정+치료) 대신 in() 배치 2요청으로 전체를 가져온다
async function fetchPatientsFullBatch(patientRows) {
  const ids = patientRows.map(p => p.id);
  const [{ data: measurements }, { data: treatments }] = await Promise.all([
    supabase.from('measurements').select('*').in('patient_id', ids).order('date'),
    supabase.from('treatments').select('*').in('patient_id', ids).order('date'),
  ]);
  const measByPatient = groupByPatientId(measurements);
  const treatByPatient = groupByPatientId(treatments);
  const fullPatients = patientRows.map(p =>
    toPatientJS(p, measByPatient[p.id] || [], treatByPatient[p.id] || []));
  for (const fp of fullPatients) setCachedPatient(fp.id, fp);
  return fullPatients;
}

export async function searchPatientsLight(query, _clinicId) {
  const { data } = await supabase.from('patients').select('id, name, birth_date, gender, custom_ref')
    .or(`name.ilike.%${escapeLike(query)}%,custom_ref.ilike.%${escapeLike(query)}%`)
    .order('name')
    .limit(20);
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    gender: p.gender, customRef: p.custom_ref,
  }));
}

export async function getPatientCount(_clinicId) {
  const { count } = await supabase.from('patients').select('id', { count: 'exact', head: true });
  return count || 0;
}

export async function getPatientById(id) {
  const cached = getCachedPatient(id);
  if (cached) return cached;

  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
  if (error || !data) return null;
  const patient = await fetchPatientFull(data);
  setCachedPatient(id, patient);
  return patient;
}

export async function searchPatients(query, _clinicId) {
  const { data, error } = await supabase.from('patients').select('*')
    .or(`name.ilike.%${escapeLike(query)}%,custom_ref.ilike.%${escapeLike(query)}%`)
    .order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}

export async function addPatient(patient) {
  // Duplicate name + birth_date (global)
  const { data: existing } = await supabase.from('patients')
    .select('id')
    .eq('name', patient.name)
    .eq('birth_date', patient.birthDate);
  if (existing && existing.length > 0) {
    return { error: '같은 이름과 생년월일의 환자가 이미 등록되어 있습니다.' };
  }
  // Duplicate custom_ref (global)
  if (patient.customRef) {
    const { data: existingRef } = await supabase.from('patients')
      .select('id')
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
    custom_ref: patient.customRef || null,
  }).select().single();
  if (error) { console.error('addPatient error:', error); return null; }
  await logAudit('create', 'patient', data.id);
  return toPatientJS(data, [], []);
}

export async function deletePatient(id) {
  await supabase.from('patients').delete().eq('id', id);
  invalidatePatient(id);
  await logAudit('delete', 'patient', id);
}

export async function updatePatient(id, updates) {
  // Check custom_ref uniqueness if being updated
  if (updates.customRef !== undefined && updates.customRef) {
    const { data: existing } = await supabase.from('patients')
      .select('id')
      .eq('custom_ref', updates.customRef)
      .neq('id', id);
    if (existing && existing.length > 0) {
      return { error: '같은 관리번호가 이미 사용 중입니다.' };
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
  invalidatePatient(id);
  await logAudit('update', 'patient', id, updates);
  return true;
}

export async function getOverduePatients(_clinicId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('patients')
    .select('*')
    .lt('next_visit_date', today)
    .order('next_visit_date');
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    nextVisitDate: p.next_visit_date, customRef: p.custom_ref,
  }));
}

export async function exportClinicData() {
  const patients = await getPatients();
  let csv = '﻿환자명,생년월일,성별,관리번호,측정일,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct,치료\n';
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
