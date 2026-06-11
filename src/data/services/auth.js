import { supabase } from '../supabaseClient.js';
import { toProfileJS } from './helpers.js';

export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // 승인 대기(비활성) 계정 구분: 인증은 성공했지만 관리자 승인 전이면 세션을 정리하고 안내한다.
  // (자기 행은 RLS상 본인이 읽을 수 있음. 실제 데이터 차단은 RLS is_active_staff().)
  const { data: profile } = await supabase
    .from('profiles').select('is_active').eq('id', data.user.id).single();
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    const e = new Error('PENDING_APPROVAL');
    e.code = 'PENDING_APPROVAL';
    throw e;
  }
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
  // getUser()는 매번 서버 왕복(~400ms). 로컬 세션을 읽고, 토큰 검증은
  // 바로 이어지는 profiles 조회(RLS)가 대신한다 — 무효 토큰이면 profile이 null.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
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
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
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
