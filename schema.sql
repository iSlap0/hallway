-- =====================================================================
-- iSlap — Supabase Postgres Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)
-- =====================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILES
-- Public, anonymous profile info. `id` matches auth.users.id 1:1.
-- The user's real Gmail email/name lives ONLY in auth.users, which is
-- never exposed to the client through these public tables/policies.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text unique not null,
  bio           text default '',
  mood_badge    text default 'Feeling new here 👋',
  avatar_url    text,
  created_at    timestamptz default now()
);

-- Basic sanity constraints on username (letters/numbers/underscore, 3-24 chars)
alter table public.profiles
  add constraint username_format check (username ~ '^[A-Za-z0-9_]{3,24}$');

-- ---------------------------------------------------------------------
-- 2. POSTS
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  content       text not null check (char_length(content) between 1 and 500),
  mood_status   text,
  created_at    timestamptz default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id);

-- ---------------------------------------------------------------------
-- 3. FOLLOWS (optional, included for future use — e.g. "following" feed)
-- ---------------------------------------------------------------------
create table if not exists public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.follows  enable row level security;

-- ---- profiles policies ------------------------------------------------
-- Anyone (including anonymous visitors) can read all profiles.
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- A user can only insert the profile row that matches their own auth id.
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- A user can only update their own profile row.
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- posts policies ---------------------------------------------------
-- Anyone can read all posts (public feed).
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

-- A user can only create posts attributed to themselves.
create policy "Users can insert their own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

-- A user can only update/delete their own posts.
create policy "Users can update their own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ---- follows policies ---------------------------------------------------
create policy "Follows are viewable by everyone"
  on public.follows for select
  using (true);

create policy "Users can follow as themselves"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow as themselves"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- =====================================================================
-- REALTIME
-- Make sure the posts table broadcasts changes. In the Supabase
-- dashboard: Database > Replication > enable "posts" for the
-- supabase_realtime publication. Or run the SQL below.
-- =====================================================================
alter publication supabase_realtime add table public.posts;

-- =====================================================================
-- NOTES
-- - Passwords are NEVER stored in a plain table. When a user sets a
--   password during onboarding, the client calls
--   supabase.auth.updateUser({ password }) which Supabase stores
--   securely (hashed) inside its own auth schema — not touched here.
-- - The real Gmail address lives in auth.users.email, which is not
--   selectable via the anon key through these policies/tables, so the
--   UI (which only ever queries `profiles`/`posts`) never sees it.
-- =====================================================================
