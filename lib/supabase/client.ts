import { createBrowserClient } from '@supabase/ssr';

export const SUPABASE_INTEGRATION_PAUSED =
  process.env.NEXT_PUBLIC_ENABLE_SUPABASE_LIVE !== 'true';

export function isSupabasePublicConfigured(): boolean {
  if (SUPABASE_INTEGRATION_PAUSED) {
    return false;
  }
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return createBrowserClient(url, anonKey);
}
