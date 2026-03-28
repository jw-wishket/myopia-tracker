import { supabase } from './supabaseClient.js';
import { calcAge, calcPct } from '../utils.js';

// ============================================
// Audit logging
// ============================================
async function logAudit(action, entityType, entityId, details = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_log').insert({
    user_id: user?.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

// ============================================
// Helper: convert DB row to JS object
// ============================================
function toPatientJS(p, measurements = [], treatments = []) {
  return {
    id: p.id,
    regNo: p.reg_no,
    name: p.name,
    birthDate: p.birth_date,
    gender: p.gender,
    clinicId: p.clinic_id,
    customRef: p.custom_ref,
    nextVisitDate: p.next_visit_date,
    followUpMonths: p.follow_up_months,
    records: measurements
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(m => ({
        id: m.id,
        date: m.date,
        age: parseFloat(m.age),
        odAL: parseFloat(m.od_al),
        osAL: parseFloat(m.os_al),
        odSE: m.od_se != null ? parseFloat(m.od_se) : null,
        osSE: m.os_se != null ? parseFloat(m.os_se) : null,
        odPct: m.od_pct,
        osPct: m.os_pct,
      })),
    treatments: treatments.map(t => ({
      id: t.id,
      type: t.type,
      date: t.date,
      age: parseFloat(t.age),
      endDate: t.end_date,
    })),
  };
}

function toProfileJS(p) {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    approved: p.approved,
    clinicId: p.clinic_id,
    clinicName: p.clinic_name,
    children: p.children || [],
  };
}

// ============================================
// Auth
// ============================================
export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return await getCurrentUser();
}

export async function registerWithEmail(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: metadata }
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return null;
  if (profile.role === 'deactivated') return null;

  // Fetch clinic name from clinics table (not the stale profiles.clinic_name)
  let clinicName = profile.clinic_name;
  if (profile.clinic_id) {
    const { data: clinic } = await supabase.from('clinics').select('name').eq('id', profile.clinic_id).single();
    if (clinic) clinicName = clinic.name;
  }

  return { ...toProfileJS(profile), clinicName };
}

// ============================================
// Patients
// ============================================
async function fetchPatientFull(patientRow) {
  const { data: measurements } = await supabase
    .from('measurements').select('*').eq('patient_id', patientRow.id).order('date');
  const { data: treatments } = await supabase
    .from('treatments').select('*').eq('patient_id', patientRow.id).order('date');
  return toPatientJS(patientRow, measurements || [], treatments || []);
}

export async function getPatients(clinicId) {
  let query = supabase.from('patients').select('*');
  if (clinicId) query = query.eq('clinic_id', clinicId);
  const { data, error } = await query.order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}

export async function getRecentPatients(clinicId, limit = 10) {
  const { data: recentMeasurements } = await supabase
    .from('measurements')
    .select('patient_id, date')
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
      if (recentIds.length >= limit * 2) break;
    }
  }

  const { data } = await supabase.from('patients').select('*')
    .eq('clinic_id', clinicId)
    .in('id', recentIds);

  if (!data) return [];

  const patientMap = {};
  data.forEach(p => { patientMap[p.id] = p; });
  const orderedRows = recentIds.map(id => patientMap[id]).filter(Boolean).slice(0, limit);
  return Promise.all(orderedRows.map(p => fetchPatientFull(p)));
}

export async function searchPatientsLight(query, clinicId) {
  const { data } = await supabase.from('patients').select('id, name, birth_date, gender, custom_ref')
    .eq('clinic_id', clinicId)
    .or(`name.ilike.%${query}%,custom_ref.ilike.%${query}%`)
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
  let q = supabase.from('patients').select('*').or(`name.ilike.%${query}%,custom_ref.ilike.%${query}%`);
  if (clinicId) q = q.eq('clinic_id', clinicId);
  const { data, error } = await q.order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}

export async function searchPatientByInfo(name, birthDate, customRef, clinicId) {
  if (!clinicId) return null;
  let query = supabase.from('patients').select('*').eq('clinic_id', clinicId).eq('name', name);
  if (customRef) {
    query = query.eq('custom_ref', customRef);
  } else if (birthDate) {
    query = query.eq('birth_date', birthDate);
  } else {
    return null;
  }
  const { data, error } = await query.limit(1).single();
  if (error || !data) return null;
  return fetchPatientFull(data);
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

// ============================================
// Measurements
// ============================================
export async function addMeasurement(patientId, record) {
  // Get patient for age/pct calculation
  const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
  if (!patient) return null;

  const age = calcAge(patient.birth_date, record.date);
  const odPct = calcPct(patient.gender, age, record.odAL);
  const osPct = calcPct(patient.gender, age, record.osAL);

  const { data, error } = await supabase.from('measurements').insert({
    patient_id: patientId,
    date: record.date,
    age,
    od_al: record.odAL,
    os_al: record.osAL,
    od_se: record.odSE ?? null,
    os_se: record.osSE ?? null,
    od_pct: odPct != null ? String(odPct) : null,
    os_pct: osPct != null ? String(osPct) : null,
  }).select().single();
  if (error) { console.error('addMeasurement error:', error); return null; }
  await logAudit('create', 'measurement', data.id, { patient_id: patientId });
  return {
    id: data.id, date: data.date, age: parseFloat(data.age),
    odAL: parseFloat(data.od_al), osAL: parseFloat(data.os_al),
    odSE: data.od_se != null ? parseFloat(data.od_se) : null,
    osSE: data.os_se != null ? parseFloat(data.os_se) : null,
    odPct: data.od_pct, osPct: data.os_pct,
  };
}

export async function deleteRecord(patientId, recordId) {
  await supabase.from('measurements').delete().eq('id', recordId);
  await logAudit('delete', 'measurement', recordId, { patient_id: patientId });
}

// ============================================
// Treatments
// ============================================
export async function addTreatment(patientId, treatment) {
  const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
  if (!patient) return null;
  const age = calcAge(patient.birth_date, treatment.date);

  const { data, error } = await supabase.from('treatments').insert({
    patient_id: patientId,
    type: treatment.type,
    date: treatment.date,
    age,
    end_date: treatment.endDate || null,
  }).select().single();
  if (error) { console.error('addTreatment error:', error); return null; }
  await logAudit('create', 'treatment', data.id, { patient_id: patientId });
  return { id: data.id, type: data.type, date: data.date, age: parseFloat(data.age), endDate: data.end_date };
}

export async function removeTreatment(patientId, treatmentId) {
  await supabase.from('treatments').delete().eq('id', treatmentId);
  await logAudit('delete', 'treatment', treatmentId, { patient_id: patientId });
}

export async function updateTreatment(treatmentId, updates) {
  const dbUpdates = {};
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  const { error } = await supabase.from('treatments').update(dbUpdates).eq('id', treatmentId);
  if (error) { console.error('updateTreatment error:', error); return false; }
  return true;
}

// ============================================
// Clinics
// ============================================
export async function getClinics() {
  const { data } = await supabase.from('clinics').select('*').eq('is_active', true).order('name');
  return (data || []).map(c => ({ id: c.id, name: c.name, createdBy: c.created_by }));
}

export async function createClinic(name) {
  const { data, error } = await supabase.from('clinics').insert({ name }).select().single();
  if (error) { console.error('createClinic error:', error); return null; }
  return { id: data.id, name: data.name, createdBy: data.created_by };
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// ============================================
// Admin
// ============================================
export async function getApprovalRequests() {
  const { data } = await supabase.from('approval_requests').select('*').eq('status', 'pending').order('created_at');
  return (data || []).map(r => ({
    id: r.id, userId: r.user_id, email: r.email, name: r.name,
    clinicName: r.clinic_name, status: r.status, createdAt: r.created_at,
  }));
}

export async function approveRequest(id) {
  const { data: req } = await supabase.from('approval_requests').select('*').eq('id', id).single();
  if (!req) return;
  await supabase.from('approval_requests').update({ status: 'approved' }).eq('id', id);
  if (req.user_id) {
    await supabase.from('profiles').update({ approved: true }).eq('id', req.user_id);
  }
}

export async function rejectRequest(id) {
  await supabase.from('approval_requests').update({ status: 'rejected' }).eq('id', id);
}

export async function getStats() {
  const [patients, doctors, clinics, pending] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'doctor'),
    supabase.from('clinics').select('id', { count: 'exact', head: true }),
    supabase.from('approval_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    totalPatients: patients.count || 0,
    totalDoctors: doctors.count || 0,
    totalClinics: clinics.count || 0,
    pendingRequests: pending.count || 0,
  };
}

// Admin: get all doctors
export async function getDoctors() {
  const { data } = await supabase.from('profiles').select('*').eq('role', 'doctor').order('name');
  return (data || []).map(d => ({
    id: d.id, email: d.email, name: d.name, approved: d.approved,
    clinicId: d.clinic_id, clinicName: d.clinic_name, createdAt: d.created_at,
  }));
}

// Admin: get all patients (across all clinics)
export async function getAllPatients() {
  const { data } = await supabase.from('patients').select('*').order('name');
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    gender: p.gender, clinicId: p.clinic_id, customRef: p.custom_ref,
  }));
}

// Admin: update clinic
export async function updateClinic(id, name) {
  const { error } = await supabase.from('clinics').update({ name }).eq('id', id);
  if (error) { console.error('updateClinic error:', error); return false; }
  // 소속 프로필의 clinic_name도 함께 업데이트
  await supabase.from('profiles').update({ clinic_name: name }).eq('clinic_id', id);
  await logAudit('update', 'clinic', id, { name });
  return true;
}

// Admin: delete clinic
export async function deleteClinic(id) {
  // Soft delete - set is_active to false
  const { error } = await supabase.from('clinics').update({ is_active: false }).eq('id', id);
  if (error) { console.error('deactivateClinic error:', error); return false; }
  await logAudit('deactivate', 'clinic', id);
  return true;
}

// Admin: create clinic
export async function adminCreateClinic(name) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('clinics').insert({ name, created_by: user?.id }).select().single();
  if (error) { console.error('adminCreateClinic error:', error); return null; }
  return { id: data.id, name: data.name, createdBy: data.created_by };
}

// Admin: revoke doctor approval
export async function revokeDoctor(doctorId) {
  const { error } = await supabase.from('profiles').update({ approved: false }).eq('id', doctorId);
  if (error) { console.error('revokeDoctor error:', error); return false; }
  return true;
}

export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const dbUpdates = {};
  if (updates.children !== undefined) dbUpdates.children = updates.children;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.clinicId !== undefined) { dbUpdates.clinic_id = updates.clinicId; }
  if (updates.clinicName !== undefined) { dbUpdates.clinic_name = updates.clinicName; }
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
  if (error) { console.error('updateProfile error:', error); return false; }
  return true;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function resetData() {
  // No-op for Supabase (data persists in cloud)
}

// ============================================
// Treatment Types
// ============================================
export async function getTreatmentTypes() {
  const { data } = await supabase.from('treatment_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  return (data || []).map(t => ({ id: t.id, name: t.name, color: t.color }));
}

export async function addTreatmentType(name, color = '#7c3aed') {
  const { data, error } = await supabase.from('treatment_types')
    .insert({ name, color })
    .select().single();
  if (error) {
    if (error.code === '23505') return null; // duplicate
    console.error('addTreatmentType error:', error);
    return null;
  }
  return { id: data.id, name: data.name, color: data.color };
}

export async function updateTreatmentType(id, updates) {
  // If renaming, update existing treatment records too
  if (updates.name !== undefined) {
    const { data: oldType } = await supabase.from('treatment_types').select('name').eq('id', id).single();
    if (oldType && oldType.name !== updates.name) {
      await supabase.from('treatments').update({ type: updates.name }).eq('type', oldType.name);
    }
  }

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  const { error } = await supabase.from('treatment_types').update(dbUpdates).eq('id', id);
  if (error) { console.error('updateTreatmentType error:', error); return false; }
  await logAudit('update', 'treatment_type', id, updates);
  return true;
}

export async function deleteTreatmentType(id) {
  await supabase.from('treatment_types').delete().eq('id', id);
}

// ============================================
// Full Clinic Data Export
// ============================================
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

// ============================================
// Account Deactivation
// ============================================
export async function deactivateUser(userId) {
  const { error } = await supabase.from('profiles').update({ approved: false, role: 'deactivated' }).eq('id', userId);
  if (error) { console.error('deactivateUser error:', error); return false; }
  await logAudit('deactivate', 'user', userId);
  return true;
}

// ============================================
// Follow-up Scheduling
// ============================================
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

// ============================================
// Notes
// ============================================
export async function getNotes(patientId) {
  const { data } = await supabase.from('notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
  return (data || []).map(n => ({ id: n.id, content: n.content, createdAt: n.created_at }));
}

export async function addNote(patientId, content) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('notes').insert({ patient_id: patientId, content, created_by: user?.id }).select().single();
  if (error) { console.error('addNote error:', error); return null; }
  return { id: data.id, content: data.content, createdAt: data.created_at };
}

export async function deleteNote(noteId) {
  await supabase.from('notes').delete().eq('id', noteId);
}

// ============================================
// CSV Import
// ============================================
export async function importMeasurements(patientId, records) {
  const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
  if (!patient) return { success: 0, errors: [] };

  let success = 0;
  const errors = [];

  for (const r of records) {
    try {
      const age = calcAge(patient.birth_date, r.date);
      const odPct = r.odAL ? calcPct(patient.gender, age, r.odAL) : null;
      const osPct = r.osAL ? calcPct(patient.gender, age, r.osAL) : null;

      const { error } = await supabase.from('measurements').insert({
        patient_id: patientId,
        date: r.date,
        age,
        od_al: r.odAL || null,
        os_al: r.osAL || null,
        od_se: r.odSE || null,
        os_se: r.osSE || null,
        od_pct: odPct != null ? String(odPct) : null,
        os_pct: osPct != null ? String(osPct) : null,
      });
      if (error) throw error;
      success++;
    } catch (e) {
      errors.push(`${r.date}: ${e.message}`);
    }
  }
  return { success, errors };
}
