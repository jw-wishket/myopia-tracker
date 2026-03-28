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
  if (profile.role === 'deactivated') return null;

  // Fetch clinic name from clinics table (not the stale profiles.clinic_name)
  let clinicName = profile.clinic_name;
  if (profile.clinic_id) {
    const { data: clinic } = await supabase.from('clinics').select('name').eq('id', profile.clinic_id).single();
    if (clinic) clinicName = clinic.name;
  }

  if (profile.role === 'doctor' && !profile.approved) {
    // Return limited profile for pending screen routing
    return { ...toProfileJS(profile), clinicName, pending: true };
  }

  return { ...toProfileJS(profile), clinicName };
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

  if (updates.children !== undefined) {
    // Validate children entries - remove any patientId that doesn't exist or doesn't match
    const validatedChildren = [];
    for (const child of updates.children) {
      const entry = { name: child.name, birthDate: child.birthDate };
      if (child.clinicId) entry.clinicId = child.clinicId;

      if (child.patientId) {
        // Verify patient exists and matches name+birthDate
        const { data: patient } = await supabase.from('patients')
          .select('id, name, birth_date')
          .eq('id', child.patientId)
          .single();
        if (patient && patient.name === child.name && patient.birth_date === child.birthDate) {
          entry.patientId = child.patientId;
        }
        // If validation fails, keep the child entry but without patientId
      }
      validatedChildren.push(entry);
    }
    dbUpdates.children = validatedChildren;
  }

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.clinicId !== undefined) { dbUpdates.clinic_id = updates.clinicId; }
  if (updates.clinicName !== undefined) { dbUpdates.clinic_name = updates.clinicName; }
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
  if (error) { console.error('updateProfile error:', error); return false; }
  return true;
}

export async function resetData() {
  // No-op for Supabase (data persists in cloud)
}
