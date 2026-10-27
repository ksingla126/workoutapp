-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- Every piece of app data (profile, logs, meals, photos, chat, advice) is one JSON document per user.
create table if not exists public.docs (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  path       text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);
alter table public.docs enable row level security;

drop policy if exists "docs: read own"   on public.docs;
drop policy if exists "docs: insert own" on public.docs;
drop policy if exists "docs: update own" on public.docs;
drop policy if exists "docs: delete own" on public.docs;
create policy "docs: read own"   on public.docs for select using (auth.uid() = user_id);
create policy "docs: insert own" on public.docs for insert with check (auth.uid() = user_id);
create policy "docs: update own" on public.docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "docs: delete own" on public.docs for delete using (auth.uid() = user_id);

-- One row per coach (Claude) request, used for the daily per-user limit. Users can add and read
-- their own rows but never delete them, so the limit can't be reset from the app.
create table if not exists public.coach_usage (
  id      bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at      timestamptz not null default now()
);
create index if not exists coach_usage_user_at on public.coach_usage (user_id, at);
alter table public.coach_usage enable row level security;

drop policy if exists "usage: read own"   on public.coach_usage;
drop policy if exists "usage: insert own" on public.coach_usage;
create policy "usage: read own"   on public.coach_usage for select using (auth.uid() = user_id);
create policy "usage: insert own" on public.coach_usage for insert with check (auth.uid() = user_id);

-- Shared barcodes: when someone scans a product no database knows and types in its name, size or label
-- nutrition, it's saved here so the next person who scans it gets it straight away.
-- One row per person per barcode. Everyone signed in can read the product fields (not who added them).
create table if not exists public.shared_barcodes (
  code       text not null check (code ~ '^[0-9]{6,14}$'),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 120),
  pack       jsonb,
  food       jsonb,
  updated_at timestamptz not null default now(),
  primary key (code, user_id)
);
create index if not exists shared_barcodes_code on public.shared_barcodes (code, updated_at desc);
alter table public.shared_barcodes enable row level security;

-- Reading is open to anyone signed in; writing only happens through the app's server (/api/barcode),
-- which ties each row to the signed-in user. Others can read the product, never who entered it.
drop policy if exists "barcodes: read all" on public.shared_barcodes;
create policy "barcodes: read all" on public.shared_barcodes for select to authenticated using (true);
revoke all on public.shared_barcodes from anon, authenticated;
grant select (code, name, pack, food, updated_at) on public.shared_barcodes to authenticated;
