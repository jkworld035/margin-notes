-- ============================================================
-- Migration: switch to direct-publish (no admin approval gate)
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

-- Publish any posts still sitting in "pending" so nothing gets lost
update public.posts set status = 'approved' where status = 'pending';

-- Loosen the check constraint (drop 'pending' as a valid value going forward)
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('approved','rejected'));
alter table public.posts alter column status set default 'approved';

-- Replace the insert policy so new posts publish immediately
drop policy if exists "users can insert own posts" on public.posts;
create policy "users can insert own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author_id and status = 'approved');
