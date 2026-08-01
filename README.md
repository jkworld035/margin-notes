# Margin Notes (Jkworld035)

A long-form blog platform with real accounts, an editorial review workflow, and an admin dashboard — built with **Next.js** (App Router) and **Supabase** (Postgres + Auth + Row-Level Security).

Anyone can sign up and write a post. Every post starts as **pending** and only appears publicly once an admin **approves** it.

## Features

- Email/password sign up & login (Supabase Auth)
- Write & submit posts for review
- Public post feed with category filtering
- Admin dashboard: approve / reject / delete posts, view stats
- Profile page showing your own posts and their status
- Access control enforced at the database level via Postgres Row-Level Security (not just hidden buttons in the UI)

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router, Server Actions)
- [Supabase](https://supabase.com/) (Postgres database, Auth, RLS)
- Plain CSS (no framework) — keeps the original warm, editorial design

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project, go to **SQL Editor > New query**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the `profiles` and `posts` tables, a trigger that auto-creates a profile on signup, and all the RLS policies.
3. Go to **Project Settings > API** and copy your **Project URL** and **anon public key**.

## 2. Run locally

```bash
git clone https://github.com/<your-username>/margin-notes.git
cd margin-notes
npm install
cp .env.local.example .env.local
# paste your Supabase URL + anon key into .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 3. Make yourself an admin

Sign up for an account through the app first, then in the Supabase **SQL Editor** run:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

You'll now see an **Admin** link in the header.

## 4. Deploy

The easiest path is [Vercel](https://vercel.com):

1. Push this repo to GitHub (see below).
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

GitHub will prompt for credentials the first time — use a [Personal Access Token](https://github.com/settings/tokens) as your password (GitHub no longer accepts your account password over HTTPS).

## Project structure

```
app/
  actions/        server actions (auth, posts)
  admin/          admin dashboard
  login/, signup/ auth pages
  post/[id]/      single post view
  profile/        a user's own posts
  write/          submit a new post
  page.tsx        home feed
lib/supabase/     Supabase client helpers (browser, server, middleware)
supabase/schema.sql  database schema + RLS policies
```

## License

MIT — see [LICENSE](./LICENSE).
