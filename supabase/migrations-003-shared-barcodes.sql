-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
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
