-- ============================================================
-- Migration: notifications
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow','like','comment')),
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users can read own notifications" on public.notifications for select to authenticated using (auth.uid() = recipient_id);
create policy "users can create notifications for others" on public.notifications for insert to authenticated with check (auth.uid() = actor_id and recipient_id <> actor_id);
create policy "users can mark own notifications read" on public.notifications for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
