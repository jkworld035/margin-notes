-- ============================================================
-- Migration: avatar column + author edit permission
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

alter table public.profiles add column if not exists avatar_url text;

create policy "authors can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
