-- ============================================================
-- Migration: subtitle, tags, bookmarks, post views
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

alter table public.posts add column if not exists subtitle text;
alter table public.posts add column if not exists tags text[] not null default '{}';
create index if not exists posts_tags_idx on public.posts using gin(tags);

create table if not exists public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists post_views_post_idx on public.post_views(post_id);
create index if not exists post_views_created_idx on public.post_views(created_at);

alter table public.bookmarks enable row level security;
alter table public.post_views enable row level security;

create policy "users can read own bookmarks" on public.bookmarks for select to authenticated using (auth.uid() = user_id);
create policy "users can bookmark as themselves" on public.bookmarks for insert to authenticated with check (auth.uid() = user_id);
create policy "users can remove own bookmark" on public.bookmarks for delete to authenticated using (auth.uid() = user_id);

create policy "anyone can log a view" on public.post_views for insert with check (true);
create policy "view counts are publicly readable" on public.post_views for select using (true);
