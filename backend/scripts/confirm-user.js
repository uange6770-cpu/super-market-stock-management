import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/confirm-user.js <email>');
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const perPage = 1000;
let page = 1;
let user;

while (!user) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
  if (error) throw error;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (user || data.users.length < perPage) break;
  page += 1;
}

if (!user) {
  console.error(`No Supabase Auth user found for ${email}.`);
  process.exit(1);
}

if (user.email_confirmed_at) {
  console.log(`Email is already confirmed for ${email}.`);
  process.exit(0);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
if (error) throw error;
console.log(`Email confirmed for ${email}. You can now sign in.`);
