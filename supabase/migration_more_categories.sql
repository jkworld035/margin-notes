-- ============================================================
-- Migration: expand primary category options
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check
  check (category in ('Essays','Design','Technology','Culture','Business','Health','Travel','Lifestyle','Science','Education'));
