-- ============================================================
-- Migration: books & chapters
-- Run this in Supabase SQL Editor > New query.
-- ============================================================

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_author_idx on public.books(author_id);
create index if not exists books_status_idx on public.books(status);

create table if not exists public.book_chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  content text not null default '',
  chapter_number integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, chapter_number)
);
create index if not exists book_chapters_book_idx on public.book_chapters(book_id, chapter_number);

alter table public.books enable row level security;
alter table public.book_chapters enable row level security;

create policy "published books are public" on public.books for select using (status = 'published');
create policy "authors can read own books" on public.books for select to authenticated using (auth.uid() = author_id);
create policy "users can create own books" on public.books for insert to authenticated with check (auth.uid() = author_id and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended = true));
create policy "authors can update own books" on public.books for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "authors or admins can delete books" on public.books for delete to authenticated using (auth.uid() = author_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "chapters of published books are public" on public.book_chapters for select using (exists (select 1 from public.books b where b.id = book_id and b.status = 'published'));
create policy "authors can read own chapters" on public.book_chapters for select to authenticated using (exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));
create policy "authors can insert own chapters" on public.book_chapters for insert to authenticated with check (exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));
create policy "authors can update own chapters" on public.book_chapters for update to authenticated using (exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid())) with check (exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));
create policy "authors can delete own chapters" on public.book_chapters for delete to authenticated using (exists (select 1 from public.books b where b.id = book_id and b.author_id = auth.uid()));
