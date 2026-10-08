-- ============================================================
-- Migration: Razorpay payments — paid books
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

alter table public.books add column if not exists price_inr integer not null default 0;
alter table public.books drop constraint if exists books_price_inr_check;
alter table public.books add constraint books_price_inr_check check (price_inr >= 0);

create table if not exists public.book_purchases (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  amount_paise integer not null,
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','paid','failed')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists book_purchases_buyer_idx on public.book_purchases(buyer_id);
create index if not exists book_purchases_book_idx on public.book_purchases(book_id);

alter table public.book_purchases enable row level security;

create policy "buyers can read own purchases" on public.book_purchases for select to authenticated using (auth.uid() = buyer_id);
create policy "authors can read purchases of own books" on public.book_purchases for select to authenticated using (exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));
create policy "admins can read all purchases" on public.book_purchases for select to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "buyers can create a pending purchase" on public.book_purchases for insert to authenticated with check (auth.uid() = buyer_id and status = 'created');

-- Deliberately no UPDATE policy here — a purchase only moves from 'created' to
-- 'paid' via the server-side admin client (service role key), after the
-- Razorpay payment signature has been cryptographically verified.

-- ------------------------------------------------------------
-- Lock paid chapters at the database level.
-- Readable by the public: every chapter of a free book, and the first chapter
-- (free preview) of a paid book. Everything else needs a verified purchase
-- (or being the author — covered by the existing "authors can read own chapters").
-- A helper function avoids a policy that queries its own table (which would
-- raise "infinite recursion detected in policy").
-- ------------------------------------------------------------
create or replace function public.book_first_chapter_number(p_book_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select min(chapter_number) from public.book_chapters where book_id = p_book_id
$$;

drop policy if exists "chapters of published books are public" on public.book_chapters;
drop policy if exists "chapters of free or purchased books are readable" on public.book_chapters;

create policy "chapters of free or purchased books are readable"
  on public.book_chapters for select
  using (
    exists (
      select 1 from public.books b
      where b.id = book_id
        and b.status = 'published'
        and (
          b.price_inr = 0
          or chapter_number = public.book_first_chapter_number(b.id)
          or exists (
            select 1 from public.book_purchases p
            where p.book_id = b.id and p.buyer_id = auth.uid() and p.status = 'paid'
          )
        )
    )
  );
