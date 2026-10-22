-- Run once in Supabase (SQL Editor → New query → paste → Run) to enable Strava auto-import.
-- Strava tokens have no policies, so only the server (with the service role key) can read or write them.
create table if not exists public.strava_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  athlete_id    bigint,
  access_token  text,
  refresh_token text,
  expires_at    bigint,
  updated_at    timestamptz not null default now()
);
alter table public.strava_tokens enable row level security;
