import { supabase } from '../supabaseClient.js';

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
