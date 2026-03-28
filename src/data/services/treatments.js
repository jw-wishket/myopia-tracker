import { supabase } from '../supabaseClient.js';
import { calcAge } from '../../utils.js';
import { logAudit } from './helpers.js';
import { invalidatePatient } from '../patientCache.js';

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
  invalidatePatient(patientId);
  await logAudit('create', 'treatment', data.id, { patient_id: patientId });
  return { id: data.id, type: data.type, date: data.date, age: parseFloat(data.age), endDate: data.end_date };
}

export async function removeTreatment(patientId, treatmentId) {
  await supabase.from('treatments').delete().eq('id', treatmentId);
  invalidatePatient(patientId);
  await logAudit('delete', 'treatment', treatmentId, { patient_id: patientId });
}

export async function updateTreatment(treatmentId, updates) {
  // Look up patient_id for cache invalidation
  const { data: treatment } = await supabase.from('treatments').select('patient_id').eq('id', treatmentId).single();

  const dbUpdates = {};
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  const { error } = await supabase.from('treatments').update(dbUpdates).eq('id', treatmentId);
  if (error) { console.error('updateTreatment error:', error); return false; }
  if (treatment) invalidatePatient(treatment.patient_id);
  return true;
}

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
