# Supabase Auth + Visitor Tracking Setup

## 1) Create environment file

Create `.env` in project root and copy from `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 2) Enable OAuth providers

In Supabase Dashboard:

- `Authentication` -> `Providers`
- Enable:
  - Google
  - GitHub
  - LinkedIn (OIDC)

Set redirect URL in each provider to:

`http://localhost:5174`

For LAN/mobile testing, also add:

`http://10.91.51.87:5174`

## 3) Create visitor log table

Run this SQL in Supabase SQL editor:

```sql
create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null,
  email text,
  provider text,
  page_path text not null,
  user_agent text
);

alter table public.site_visits enable row level security;

create policy "allow insert own visits"
on public.site_visits
for insert
to authenticated
with check (auth.uid() = user_id);
```

## 4) Run app

```bash
npm run dev
```

After login, each page view is inserted into `public.site_visits`.
