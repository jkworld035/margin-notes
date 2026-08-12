-- ============================================================
-- Migration: collaborative co-authoring
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

alter table public.posts add column if not exists co_author_ids uuid[] not null default '{}';

drop policy if exists "authors can read own posts" on public.posts;
create policy "authors can read own posts"
  on public.posts for select
  to authenticated
  using (auth.uid() = author_id or auth.uid() = any(co_author_ids));

drop policy if exists "authors can update own posts" on public.posts;
create policy "authors can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id or auth.uid() = any(co_author_ids))
  with check (auth.uid() = author_id or auth.uid() = any(co_author_ids));
