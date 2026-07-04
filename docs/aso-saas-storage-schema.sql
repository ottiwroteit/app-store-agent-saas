-- Rank Rescue ASO SaaS production storage.
-- Run this in Supabase SQL editor, then set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.aso_saas_workspaces (
  id text primary key,
  email text not null default '',
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists aso_saas_workspaces_email_idx
  on public.aso_saas_workspaces (lower(email));

create index if not exists aso_saas_workspaces_updated_at_idx
  on public.aso_saas_workspaces (updated_at desc);

create table if not exists public.aso_saas_notifications (
  id text primary key,
  workspace_id text not null default '',
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists aso_saas_notifications_workspace_idx
  on public.aso_saas_notifications (workspace_id, created_at desc);

alter table public.aso_saas_workspaces enable row level security;
alter table public.aso_saas_notifications enable row level security;

-- The app uses SUPABASE_SERVICE_ROLE_KEY from the server only. Do not expose that key in browsers.
-- No anon policies are required for the current server-rendered API path.
