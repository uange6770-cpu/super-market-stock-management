import { createClient } from '@supabase/supabase-js';
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('Supabase environment is incomplete; API requests will fail until configured.');
export const db = createClient(process.env.SUPABASE_URL || 'https://placeholder.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder', { auth: { persistSession: false } });
export const authClient = createClient(process.env.SUPABASE_URL || 'https://placeholder.supabase.co', process.env.SUPABASE_ANON_KEY || 'placeholder', { auth: { persistSession: false } });

// Use the caller's JWT for security-definer RPCs so auth.uid() and database
// role checks refer to the signed-in user instead of the service role.
export function userDb(token) {
  return createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'placeholder',
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
}
