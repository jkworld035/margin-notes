-- ============================================================
-- Migration: social features (cover images, likes, comments, follows)
-- Run this if you already ran the original schema.sql.
-- Run in Supabase SQL Editor > New query.
-- ============================================================

alter table public.posts
  add column if not exists cover_image_url text;

create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments(post_id);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

create policy "likes are publicly readable" on public.likes for select using (true);
create policy "users can like as themselves" on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "users can unlike their own like" on public.likes for delete to authenticated using (auth.uid() = user_id);

create policy "comments visible with their post" on public.comments for select using (
  exists (
    select 1 from public.posts p
    where p.id = post_id
      and (
        p.status = 'approved'
        or p.author_id = auth.uid()
        or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
      )
  )
);
create policy "authenticated users can comment" on public.comments for insert to authenticated with check (
  auth.uid() = author_id
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
);
create policy "authors or admins can delete comments" on public.comments for delete to authenticated using (
  auth.uid() = author_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

create policy "follows are publicly readable" on public.follows for select using (true);
create policy "users can follow as themselves" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "users can unfollow as themselves" on public.follows for delete to authenticated using (auth.uid() = follower_id);
