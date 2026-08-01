# Margin Notes (Jkworld035)

A full-featured publishing platform — real accounts, instant publishing, a social layer (claps, comments, bookmarks, follows, notifications), search, tags, trending, dark mode, and a stats dashboard — built with **Next.js** (App Router) and **Supabase** (Postgres + Auth + Row-Level Security + Storage).

Anyone can sign up and publish. There's no approval queue — stories go live the moment you hit **Publish**. An admin can still take a story down after the fact if it violates guidelines.

## Features

- Email/password sign up & login (Supabase Auth)
- Instant publishing — no review gate
- Rich-ish editor: bold, italic, headings, quotes, tags, subtitle, cover image (upload from device via Supabase Storage)
- Claps (likes), comments, bookmarks, follow authors
- In-app notifications (follows, claps, comments) with an unread badge
- Search, tag filtering, a trending sidebar, and a "Following" feed
- Dark mode
- Public author profile pages with follower counts
- Admin moderation dashboard: take down / restore posts
- An illustrative earnings dashboard (views, claps, comments per story — **not connected to real payments**)
- Access control enforced at the database level via Postgres Row-Level Security, not just hidden UI

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- [Supabase](https://supabase.com/) (Postgres database, Auth, Storage, RLS)
- Plain CSS (no framework) — keeps the original warm, editorial design

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project, go to **SQL Editor > New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates every table (`profiles`, `posts`, `likes`, `comments`, `bookmarks`, `follows`, `post_views`, `notifications`) plus the signup trigger and all RLS policies.
3. Create the image storage bucket — run this too:
   ```sql
   insert into storage.buckets (id, name, public)
   values ('post-images', 'post-images', true)
   on conflict (id) do nothing;

   create policy "public read post images" on storage.objects for select using (bucket_id = 'post-images');
   create policy "authenticated users can upload post images" on storage.objects for insert to authenticated with check (bucket_id = 'post-images');
   create policy "users can delete own post images" on storage.objects for delete to authenticated using (bucket_id = 'post-images' and owner = auth.uid());
   ```
4. Go to **Project Settings > API** and copy your **Project URL** and **publishable (anon) key**.

*(If you're migrating an older copy of this project instead of starting fresh, use the individual `supabase/migration_*.sql` files in order instead of the full `schema.sql`.)*

## 2. Run locally

```bash
git clone https://github.com/<your-username>/margin-notes.git
cd margin-notes
npm install
cp .env.local.example .env.local
# paste your Supabase URL + publishable key into .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 3. Make yourself an admin

Sign up for an account through the app first, then in the Supabase **SQL Editor** run:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

You'll now see an **Admin** link in the header, for moderating posts.

## 4. Deploy

The easiest path is [Vercel](https://vercel.com):

1. Push this repo to GitHub (see below, if you haven't already).
2. Import the repo into Vercel.
3. Add the two env vars from `.env.local` in the Vercel project settings.
4. Deploy.

## Publishing this repo to GitHub

If you don't have a repo yet:

1. Go to [github.com/new](https://github.com/new), name it `margin-notes`, leave it **empty** (no README/license — you already have those), and click **Create repository**.
2. From this project folder, run:

```bash
git init
git add .
git commit -m "Initial commit: Margin Notes blog platform"
git branch -M main
git remote add origin https://github.com/<your-username>/margin-notes.git
git push -u origin main
```

GitHub will prompt for credentials the first time — use a [Personal Access Token](https://github.com/settings/tokens) as your password, or sign in through the browser prompt if using VS Code's built-in Git tools.

## Project structure

```
app/
  actions/          server actions (auth, posts, social)
  admin/            moderation dashboard
  author/[id]/      public author profile
  earnings/         stats dashboard (illustrative, no real payments)
  login/, signup/   auth pages
  notifications/    activity feed
  post/[id]/        single post view (likes, comments, bookmarks, reading progress)
  profile/          your own posts + saved (bookmarked) stories
  write/            publish a new story
  page.tsx          home feed (search, tags, trending, Following)
lib/supabase/       Supabase client helpers (browser, server, middleware)
lib/render-content.tsx  safe lightweight content renderer (headings, quotes, bold/italic)
supabase/schema.sql database schema + RLS policies (fresh installs)
supabase/migration_*.sql  incremental migrations (existing installs)
```

## What's not built (by design)

- **Real payments.** The earnings dashboard shows real usage stats but no money moves — that needs a Stripe/Razorpay account set up separately.
- **AI features.** Not included — each one needs a paid API and ongoing cost.
- **Native mobile apps.** The web app works fine on mobile browsers; a PWA/native app is a separate future effort.

## License

MIT — see [LICENSE](./LICENSE).
