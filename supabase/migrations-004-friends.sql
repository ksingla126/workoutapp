-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Friends: a small public card per player who turns friends on, and who is friends with whom.
-- Only the app's server (/api/friends, with the service role key) reads or writes these tables.
create table if not exists public.player_cards (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique check (code ~ '^[A-Z0-9]{6,8}$'),
  name       text not null check (char_length(name) between 1 and 30),
  card       jsonb,
  visible    boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.friendships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  friend_id  uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.player_cards enable row level security;
alter table public.friendships enable row level security;
revoke all on public.player_cards from anon, authenticated;
revoke all on public.friendships from anon, authenticated;
