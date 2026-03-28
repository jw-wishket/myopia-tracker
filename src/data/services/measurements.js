import { supabase } from '../supabaseClient.js';
import { calcAge, calcPct } from '../../utils.js';
import { logAudit } from './helpers.js';
import { invalidatePatient } from '../patientCache.js';

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
  invalidatePatient(patientId);
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
  invalidatePatient(patientId);
  await logAudit('delete', 'measurement', recordId, { patient_id: patientId });
}

export async function importMeasurements(patientId, records) {
  const { data: patient } = await supabase.from('patients').select('*').eq('id', patientId).single();
  if (!patient) return { success: 0, errors: [] };

  const rows = [];
  const errors = [];

  for (const r of records) {
    try {
      const age = calcAge(patient.birth_date, r.date);
      const odPct = r.odAL ? calcPct(patient.gender, age, r.odAL) : null;
      const osPct = r.osAL ? calcPct(patient.gender, age, r.osAL) : null;
      rows.push({
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
    } catch (e) {
      errors.push(`${r.date}: ${e.message}`);
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('measurements').insert(rows);
    if (error) {
      errors.push(error.message);
      return { success: 0, errors };
    }
  }

  invalidatePatient(patientId);
  await logAudit('import', 'measurements', patientId, { count: rows.length });
  return { success: rows.length, errors };
}
