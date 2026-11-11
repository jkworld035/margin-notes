-- ============================================================
-- Migration: views, likes and claps for books
-- Run in Supabase SQL Editor > New query.
-- ============================================================

create table if not exists public.book_views (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists book_views_book_idx on public.book_views(book_id);

create table if not exists public.book_likes (
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

create table if not exists public.book_claps (
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claps integer not null default 1 check (claps between 1 and 50),
  updated_at timestamptz not null default now(),
  primary key (book_id, user_id)
);

alter table public.book_views enable row level security;
alter table public.book_likes enable row level security;
alter table public.book_claps enable row level security;

-- Views: anyone may log a view of a published book. Counts come from book_engagement().
drop policy if exists "anyone can log a book view" on public.book_views;
create policy "anyone can log a book view" on public.book_views for insert
  with check (exists (select 1 from public.books b where b.id = book_id and b.status = 'published'));

-- Likes: signed-in readers manage their own like.
drop policy if exists "users read own book likes" on public.book_likes;
create policy "users read own book likes" on public.book_likes for select to authenticated using (auth.uid() = user_id);
drop policy if exists "users like books as themselves" on public.book_likes;
create policy "users like books as themselves" on public.book_likes for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.books b where b.id = book_id and b.status = 'published' and b.author_id <> auth.uid())
  );
drop policy if exists "users remove own book like" on public.book_likes;
create policy "users remove own book like" on public.book_likes for delete to authenticated using (auth.uid() = user_id);

-- Claps are only written through clap_book() below.
drop policy if exists "users read own book claps" on public.book_claps;
create policy "users read own book claps" on public.book_claps for select to authenticated using (auth.uid() = user_id);

-- Atomically add claps (max 50 per reader per book). Returns the reader's new total.
create or replace function public.clap_book(p_book_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;
  if p_amount is null or p_amount < 1 or p_amount > 50 then raise exception 'bad_amount'; end if;
  if not exists (select 1 from public.books b where b.id = p_book_id and b.status = 'published' and b.author_id <> v_user) then
    raise exception 'not_allowed';
  end if;

  insert into public.book_claps (book_id, user_id, claps)
  values (p_book_id, v_user, least(p_amount, 50))
  on conflict (book_id, user_id)
  do update set claps = least(public.book_claps.claps + p_amount, 50), updated_at = now()
  returning claps into v_total;

  return v_total;
end;
$$;
revoke all on function public.clap_book(uuid, integer) from public;
grant execute on function public.clap_book(uuid, integer) to authenticated;

-- Public totals plus the current reader's own like/claps, for the book page.
create or replace function public.book_engagement(p_book_id uuid)
returns table (views bigint, likes bigint, claps bigint, my_liked boolean, my_claps integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.book_views v where v.book_id = p_book_id),
    (select count(*) from public.book_likes l where l.book_id = p_book_id),
    (select coalesce(sum(c.claps), 0) from public.book_claps c where c.book_id = p_book_id),
    exists (select 1 from public.book_likes l where l.book_id = p_book_id and l.user_id = auth.uid()),
    coalesce((select c.claps from public.book_claps c where c.book_id = p_book_id and c.user_id = auth.uid()), 0)
  where exists (select 1 from public.books b where b.id = p_book_id and b.status = 'published')
$$;
grant execute on function public.book_engagement(uuid) to anon, authenticated;
