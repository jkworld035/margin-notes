-- ============================================================
-- Margin Notes — Supabase schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- Profiles table: one row per auth.users row, holds display info + role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  bio text not null default '',
  avatar_url text,
  suspended boolean not null default false,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

-- Posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  excerpt text not null,
  content text not null,
  cover_image_url text,
  tags text[] not null default '{}',
  category text not null default 'Essays' check (category in ('Essays','Design','Technology','Culture','Business','Health','Travel','Lifestyle','Science','Education')),
  author_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'approved' check (status in ('approved','rejected','draft')),
  co_author_ids uuid[] not null default '{}',
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_status_idx on public.posts(status);
create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_tags_idx on public.posts using gin(tags);

-- Bookmarks (saved stories)
create table if not exists public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Post views (for trending + earnings-style stats; not tied to real payments)
create table if not exists public.post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists post_views_post_idx on public.post_views(post_id);
create index if not exists post_views_created_idx on public.post_views(created_at);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('follow','like','comment','reply')),
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, created_at desc);

-- Reports (content moderation queue)
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

-- Likes
create table if not exists public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments(post_id);
create index if not exists comments_parent_idx on public.comments(parent_id);

-- Follows: follower_id follows following_id
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Profiles: anyone signed in can read basic profile info (needed to show author names)
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Profiles: a user can update only their own row (not their own role)
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Profiles: admins can update any profile (for suspend / role management)
create policy "admins can update any profile"
  on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Posts: anyone can read approved posts once their scheduled time (if any) has passed
create policy "approved posts are public"
  on public.posts for select
  using (status = 'approved' and (scheduled_at is null or scheduled_at <= now()));

-- Posts: authors and co-authors can read their own posts regardless of status
create policy "authors can read own posts"
  on public.posts for select
  to authenticated
  using (auth.uid() = author_id or auth.uid() = any(co_author_ids));

-- Posts: admins can read every post
create policy "admins can read all posts"
  on public.posts for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Posts: authenticated users can create a post as themselves — published, scheduled, or as a draft
create policy "users can insert own posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and status in ('approved', 'draft')
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

-- Posts: only admins can change status (approve/reject)
create policy "admins can update post status"
  on public.posts for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Posts: authors and co-authors can edit the post
create policy "authors can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id or auth.uid() = any(co_author_ids))
  with check (auth.uid() = author_id or auth.uid() = any(co_author_ids));

-- Posts: admins can delete any post, authors can delete their own
create policy "admins or owners can delete posts"
  on public.posts for delete
  to authenticated
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- Likes
-- ============================================================
alter table public.likes enable row level security;

create policy "likes are publicly readable"
  on public.likes for select
  using (true);

create policy "users can like as themselves"
  on public.likes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

create policy "users can unlike their own like"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- Comments
-- ============================================================
alter table public.comments enable row level security;

-- Comments are visible if the underlying post is visible to you
create policy "comments visible with their post"
  on public.comments for select
  using (
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

create policy "authenticated users can comment"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

create policy "authors or admins can delete comments"
  on public.comments for delete
  to authenticated
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- Follows
-- ============================================================
alter table public.follows enable row level security;

create policy "follows are publicly readable"
  on public.follows for select
  using (true);

create policy "users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true)
  );

create policy "users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

-- ============================================================
-- Bookmarks
-- ============================================================
alter table public.bookmarks enable row level security;

create policy "users can read own bookmarks"
  on public.bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can bookmark as themselves"
  on public.bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can remove own bookmark"
  on public.bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- Post views — anonymous, aggregate-only, used for trending + stats
-- ============================================================
alter table public.post_views enable row level security;

create policy "anyone can log a view"
  on public.post_views for insert
  with check (true);

create policy "view counts are publicly readable"
  on public.post_views for select
  using (true);

-- ============================================================
-- Notifications
-- ============================================================
alter table public.notifications enable row level security;

create policy "users can read own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

create policy "users can create notifications for others"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = actor_id and recipient_id <> actor_id);

create policy "users can mark own notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- ============================================================
-- ============================================================
-- Reports
-- ============================================================
alter table public.reports enable row level security;

create policy "users can create reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

create policy "admins can read all reports"
  on public.reports for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "reporters can read own reports"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "admins can update reports"
  on public.reports for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Optional: promote your first user to admin after they sign up
-- Run this manually once, replacing the email:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================
