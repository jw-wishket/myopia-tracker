import { supabase } from '../supabaseClient.js';
import { logAudit } from './helpers.js';

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

export async function getDoctors() {
  const { data } = await supabase.from('profiles').select('*').eq('role', 'doctor').order('name');
  return (data || []).map(d => ({
    id: d.id, email: d.email, name: d.name, approved: d.approved,
    clinicId: d.clinic_id, clinicName: d.clinic_name, createdAt: d.created_at,
  }));
}

export async function getAllPatients() {
  const { data } = await supabase.from('patients').select('*').order('name');
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    gender: p.gender, clinicId: p.clinic_id, customRef: p.custom_ref,
  }));
}

export async function deactivateUser(userId) {
  const { error } = await supabase.from('profiles').update({ approved: false, role: 'deactivated' }).eq('id', userId);
  if (error) { console.error('deactivateUser error:', error); return false; }
  await logAudit('deactivate', 'user', userId);
  return true;
}

export async function revokeDoctor(doctorId) {
  const { error } = await supabase.from('profiles').update({ approved: false }).eq('id', doctorId);
  if (error) { console.error('revokeDoctor error:', error); return false; }
  return true;
}
