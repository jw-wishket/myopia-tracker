import { supabase } from '../supabaseClient.js';
import { logAudit } from './helpers.js';

export async function getStats() {
  const [patients, staff] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  return {
    totalPatients: patients.count || 0,
    totalStaff: staff.count || 0,
  };
}

// All doctor/nurse accounts for the user-management list.
export async function getUsers() {
  const { data } = await supabase.from('profiles').select('*').order('created_at');
  return (data || []).map(u => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    isAdmin: u.is_admin, isActive: u.is_active, createdAt: u.created_at,
  }));
}

export async function setUserAdmin(userId, isAdmin) {
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', userId);
  if (error) { console.error('setUserAdmin error:', error); return false; }
  await logAudit(isAdmin ? 'grant_admin' : 'revoke_admin', 'user', userId);
  return true;
}

export async function setUserActive(userId, isActive) {
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) { console.error('setUserActive error:', error); return false; }
  await logAudit(isActive ? 'activate' : 'deactivate', 'user', userId);
  return true;
}
