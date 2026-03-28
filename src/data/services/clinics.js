import { supabase } from '../supabaseClient.js';
import { logAudit } from './helpers.js';

export async function getClinics() {
  const { data } = await supabase.from('clinics').select('*').eq('is_active', true).order('name');
  return (data || []).map(c => ({ id: c.id, name: c.name, createdBy: c.created_by }));
}

export async function createClinic(name) {
  const { data, error } = await supabase.from('clinics').insert({ name }).select().single();
  if (error) { console.error('createClinic error:', error); return null; }
  return { id: data.id, name: data.name, createdBy: data.created_by };
}

export async function updateClinic(id, name) {
  const { error } = await supabase.from('clinics').update({ name }).eq('id', id);
  if (error) { console.error('updateClinic error:', error); return false; }
  // 소속 프로필의 clinic_name도 함께 업데이트
  await supabase.from('profiles').update({ clinic_name: name }).eq('clinic_id', id);
  await logAudit('update', 'clinic', id, { name });
  return true;
}

export async function deleteClinic(id) {
  // Soft delete - set is_active to false
  const { error } = await supabase.from('clinics').update({ is_active: false }).eq('id', id);
  if (error) { console.error('deactivateClinic error:', error); return false; }
  await logAudit('deactivate', 'clinic', id);
  return true;
}

export async function adminCreateClinic(name) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('clinics').insert({ name, created_by: user?.id }).select().single();
  if (error) { console.error('adminCreateClinic error:', error); return null; }
  return { id: data.id, name: data.name, createdBy: data.created_by };
}
