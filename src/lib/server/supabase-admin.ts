import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-config';

export function getAdminSupabase() {
  const { url } = getSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Checkout is not configured. Missing server-side Supabase credentials.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
