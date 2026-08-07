-- ============================================================
-- Migration: user suspension + admin management
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

alter table public.profiles add column if not exists suspended boolean not null default false;

create policy "admins can update any profile"
  on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "users can insert own posts" on public.posts;
create policy "users can insert own posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and status = 'approved'
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

drop policy if exists "users can like as themselves" on public.likes;
create policy "users can like as themselves"
  on public.likes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

drop policy if exists "authenticated users can comment" on public.comments;
create policy "authenticated users can comment"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

drop policy if exists "users can follow as themselves" on public.follows;
create policy "users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );
