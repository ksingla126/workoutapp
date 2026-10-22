-- Run once in Supabase (SQL Editor → New query → paste → Run) to enable reminders and Strava sync.

-- Push subscriptions for reminders: each user manages their own rows.
create table if not exists public.push_subs (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sub        jsonb not null,
  settings   jsonb not null default '{}',
  schedule   jsonb not null default '{}',
  tz         text,
  last_sent  jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists "push: own" on public.push_subs;
create policy "push: own" on public.push_subs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Strava tokens: no policies, so only the server (service role key) can read or write them.
create table if not exists public.strava_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  athlete_id    bigint,
  access_token  text,
  refresh_token text,
  expires_at    bigint,
  updated_at    timestamptz not null default now()
);
alter table public.strava_tokens enable row level security;
