import { createClient } from '@supabase/supabase-js';

export const SUPABASE_INTEGRATION_PAUSED =
  process.env.NEXT_PUBLIC_ENABLE_SUPABASE_LIVE !== 'true';

export function isSupabaseConfigured(): boolean {
  if (SUPABASE_INTEGRATION_PAUSED) {
    return false;
  }
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
