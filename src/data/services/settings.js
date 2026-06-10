import { supabase } from '../supabaseClient.js';
import { logAudit } from './helpers.js';

export async function getSetting(key) {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user?.id });
  if (error) { console.error('setSetting error:', error); return false; }
  await logAudit('update_setting', 'app_settings', null, { key, value });
  return true;
}
