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
    isAdmin: p.is_admin ?? false,
    isActive: p.is_active ?? true,
  };
}

// 날짜 내림차순 측정 행에서 최근 등장 순서대로 중복 없는 환자 id를 limit개까지 추출
export function firstDistinctPatientIds(rows, limit) {
  const seen = new Set();
  const ids = [];
  for (const r of rows || []) {
    if (!seen.has(r.patient_id)) {
      seen.add(r.patient_id);
      ids.push(r.patient_id);
      if (ids.length >= limit) break;
    }
  }
  return ids;
}

// 배치 조회한 행들을 patient_id별로 묶는다 (행 순서 보존)
export function groupByPatientId(rows) {
  const grouped = {};
  for (const r of rows || []) {
    (grouped[r.patient_id] ||= []).push(r);
  }
  return grouped;
}

export async function fetchPatientFull(patientRow) {
  const [{ data: measurements }, { data: treatments }] = await Promise.all([
    supabase.from('measurements').select('*').eq('patient_id', patientRow.id).order('date'),
    supabase.from('treatments').select('*').eq('patient_id', patientRow.id).order('date'),
  ]);
  return toPatientJS(patientRow, measurements || [], treatments || []);
}

export async function logAudit(action, entityType, entityId, details = {}) {
  // getUser()는 서버 왕복이라 모든 CRUD에 ~400ms를 더한다. 로컬 세션이면 충분.
  const { data: { session } } = await supabase.auth.getSession();
  await supabase.from('audit_log').insert({
    user_id: session?.user?.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}
