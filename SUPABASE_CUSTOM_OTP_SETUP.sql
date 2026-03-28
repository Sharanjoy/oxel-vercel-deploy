create extension if not exists pgcrypto;

create table if not exists public.custom_auth_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_auth_sessions (
  token text primary key,
  email text not null,
  provider text not null default 'custom_otp',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  auth_email text,
  provider text,
  page_path text not null,
  user_agent text,
  session_token text
);

create table if not exists public.site_inquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  inquiry_type text not null check (inquiry_type in ('contact', 'project')),
  auth_email text not null,
  session_token text not null,
  name text not null,
  phone text not null,
  email text not null,
  project_description text,
  source_page text
);

alter table public.custom_auth_otps enable row level security;
alter table public.custom_auth_sessions enable row level security;
alter table public.site_visits enable row level security;
alter table public.site_inquiries enable row level security;

drop policy if exists "allow anon insert visits" on public.site_visits;
create policy "allow anon insert visits"
on public.site_visits
for insert
to anon, authenticated
with check (true);

drop policy if exists "allow anon insert inquiries" on public.site_inquiries;
create policy "allow anon insert inquiries"
on public.site_inquiries
for insert
to anon, authenticated
with check (true);
