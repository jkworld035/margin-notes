-- ============================================================
-- Migration: author-controlled free preview for paid books
-- Run in Supabase SQL Editor > New query.
-- ============================================================

alter table public.books
  add column if not exists preview_chapters integer not null default 1;

alter table public.books drop constraint if exists books_preview_chapters_check;
alter table public.books
  add constraint books_preview_chapters_check check (preview_chapters between 0 and 20);

-- The highest chapter number readable for free in a paid book
-- (0 = no free preview). Chapters are counted in reading order.
create or replace function public.book_preview_limit(p_book_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when b.preview_chapters <= 0 then 0
    else coalesce(
      (select c.chapter_number from public.book_chapters c
        where c.book_id = b.id order by c.chapter_number
        offset (b.preview_chapters - 1) limit 1),
      (select max(c.chapter_number) from public.book_chapters c where c.book_id = b.id),
      0
    )
  end
  from public.books b where b.id = p_book_id
$$;

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
          or chapter_number <= public.book_preview_limit(b.id)
          or exists (
            select 1 from public.book_purchases p
            where p.book_id = b.id and p.buyer_id = auth.uid() and p.status = 'paid'
          )
        )
    )
  );
