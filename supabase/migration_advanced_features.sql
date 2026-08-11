-- ============================================================
-- Migration: drafts, scheduled publishing, threaded replies, reports
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

-- Drafts + scheduling
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('approved','rejected','draft'));
alter table public.posts add column if not exists scheduled_at timestamptz;

drop policy if exists "approved posts are public" on public.posts;
create policy "approved posts are public"
  on public.posts for select
  using (status = 'approved' and (scheduled_at is null or scheduled_at <= now()));

drop policy if exists "users can insert own posts" on public.posts;
create policy "users can insert own posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and status in ('approved', 'draft')
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

-- Threaded replies
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_idx on public.comments(parent_id);

-- Reply notification type
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('follow','like','comment','reply'));

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);
create index if not exists reports_status_idx on public.reports(status);

alter table public.reports enable row level security;

create policy "users can create reports" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "admins can read all reports" on public.reports for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "reporters can read own reports" on public.reports for select to authenticated using (auth.uid() = reporter_id);
create policy "admins can update reports" on public.reports for update to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
