import { supabase } from '../supabaseClient.js';
import { toProfileJS } from './helpers.js';

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
  if (profile.is_active === false) return null; // UX gate; real gate is RLS is_active_staff()

  return toProfileJS(profile);
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (Object.keys(dbUpdates).length === 0) return true;
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
  if (error) { console.error('updateProfile error:', error); return false; }
  return true;
}

export async function resetData() {
  // No-op for Supabase (data persists in cloud)
}
