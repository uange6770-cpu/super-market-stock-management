# SuperMart Stock Manager

Responsive stock management app built with React, Vite, Express and Supabase.

## Development

1. Create a Supabase project and run `supabase/migrations/001_initial_schema.sql` in its SQL editor.
2. Create the first account with Supabase Auth, then promote it once in the Supabase SQL editor: `update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'your-admin@example.com');`. New accounts start as staff.
3. Copy `backend/.env.example` to `backend/.env` and set the Supabase URL, anon key and service role key. The service role key belongs only in the backend environment.
4. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL=http://localhost:4000/api` plus the public Supabase URL and anon key.
5. Run `npm install` in `backend` and `frontend`, then start each with `npm run dev`.

The backend uses Supabase Auth bearer tokens and keeps the service role key on the server. The dashboard and report data are queried from PostgreSQL. Sale and receipt writes run as atomic database functions; stock reductions cannot oversell. RLS allows authenticated reads while business writes go through role checked API endpoints and database functions. Until Supabase is configured, the UI reports the API connection state and does not substitute sample metrics.

Deploy `frontend` and `backend` as separate Vercel projects. Configure the frontend variables from `frontend/.env.example`, and configure the backend variables from `backend/.env.example`; set `FRONTEND_ORIGIN` to the deployed frontend origin. No credentials should be committed.
