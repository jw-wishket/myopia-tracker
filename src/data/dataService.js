import { supabase } from './supabaseClient.js';
import { calcAge, calcPct } from '../utils.js';

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
  return toProfileJS(profile);
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

export async function getPatientById(id) {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
  if (error || !data) return null;
  return fetchPatientFull(data);
}

export async function searchPatients(query, clinicId) {
  let q = supabase.from('patients').select('*').or(`name.ilike.%${query}%,reg_no.ilike.%${query}%`);
  if (clinicId) q = q.eq('clinic_id', clinicId);
  const { data, error } = await q.order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}

export async function searchPatientByInfo(name, birthDate) {
  const { data, error } = await supabase
    .from('patients').select('*').eq('name', name).eq('birth_date', birthDate).limit(1).single();
  if (error || !data) return null;
  return fetchPatientFull(data);
}

export async function addPatient(patient) {
  const { data, error } = await supabase.from('patients').insert({
    name: patient.name,
    birth_date: patient.birthDate,
    gender: patient.gender,
    reg_no: patient.regNo || null,
    clinic_id: patient.clinicId,
  }).select().single();
  if (error) { console.error('addPatient error:', error); return null; }
  return toPatientJS(data, [], []);
}

export async function deletePatient(id) {
  await supabase.from('patients').delete().eq('id', id);
}

export async function updatePatient(id, updates) {
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate;
  if (updates.regNo !== undefined) dbUpdates.reg_no = updates.regNo;
  const { error } = await supabase.from('patients').update(dbUpdates).eq('id', id);
  if (error) { console.error('updatePatient error:', error); return false; }
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
  }).select().single();
  if (error) { console.error('addTreatment error:', error); return null; }
  return { id: data.id, type: data.type, date: data.date, age: parseFloat(data.age) };
}

export async function removeTreatment(patientId, treatmentId) {
  await supabase.from('treatments').delete().eq('id', treatmentId);
}

// ============================================
// Clinics
// ============================================
export async function getClinics() {
  const { data } = await supabase.from('clinics').select('*').order('name');
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

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function resetData() {
  // No-op for Supabase (data persists in cloud)
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
