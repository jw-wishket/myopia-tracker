import { supabase } from '../supabaseClient.js';
import { calcAge, calcPct } from '../../utils.js';

export function escapeLike(str) {
  return str.replace(/[%_\\]/g, c => '\\' + c);
}

export function toPatientJS(p, measurements = [], treatments = []) {
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

export function toProfileJS(p) {
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

export async function fetchPatientFull(patientRow) {
  const { data: measurements } = await supabase
    .from('measurements').select('*').eq('patient_id', patientRow.id).order('date');
  const { data: treatments } = await supabase
    .from('treatments').select('*').eq('patient_id', patientRow.id).order('date');
  return toPatientJS(patientRow, measurements || [], treatments || []);
}

export async function logAudit(action, entityType, entityId, details = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_log').insert({
    user_id: user?.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
