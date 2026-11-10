import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import BookCover from "@/app/books/book-cover";

export const metadata: Metadata = {
  title: "My Library — Margin Notes",
  robots: { index: false },
};

const TABS = [
  { key: "all", label: "All" },
  { key: "reading", label: "Reading" },
  { key: "completed", label: "Completed" },
  { key: "purchased", label: "Purchased" },
  { key: "saved", label: "Saved" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Progress = {
  book_id: string;
  chapter_number: number;
  percent: number;
  completed: boolean;
  updated_at: string;
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [purchasesRes, savedRes, progressRes] = await Promise.all([
    supabase.from("book_purchases").select("book_id").eq("buyer_id", user.id).eq("status", "paid"),
    supabase.from("library_books").select("book_id, created_at").eq("user_id", user.id),
    supabase
      .from("reading_progress")
      .select("book_id, chapter_number, percent, completed, updated_at")
      .eq("user_id", user.id),
  ]);

  const purchased = new Set((purchasesRes.data || []).map((r) => r.book_id as string));
  const saved = new Set((savedRes.data || []).map((r) => r.book_id as string));
  const progress = new Map<string, Progress>(
    ((progressRes.data || []) as Progress[]).map((p) => [p.book_id, p])
  );

  const ids = Array.from(new Set([...purchased, ...saved, ...progress.keys()]));

  let books: any[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("books")
      .select("id, title, cover_image_url, price_inr, profiles!books_author_id_fkey(name)")
      .in("id", ids)
      .eq("status", "published");
    books = data || [];
  }

  const matches = (id: string) => {
    const p = progress.get(id);
    switch (active) {
      case "purchased":
        return purchased.has(id);
      case "saved":
        return saved.has(id);
      case "reading":
        return !!p && !p.completed && p.percent > 0;
      case "completed":
        return !!p?.completed;
      default:
        return true;
    }
  };

  const shown = books
    .filter((b) => matches(b.id))
    .sort((a, b) => {
      const ta = progress.get(a.id)?.updated_at ?? "";
      const tb = progress.get(b.id)?.updated_at ?? "";
      return tb.localeCompare(ta);
    });

  return (
    <div className="posts-section" style={{ paddingTop: "2rem" }}>
      <div className="section-bar">
        <h2>My Library</h2>
        <Link href="/books" className="btn btn-ghost btn-sm">
          Browse books
        </Link>
      </div>

      <div className="filter-tabs" style={{ marginBottom: "1.6rem" }}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/library" : `/library?tab=${t.key}`}
            className={`filter-tab${active === t.key ? " active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="empty-state" style={{ background: "transparent" }}>
          {active === "all"
            ? "Your library is empty. Save a book or start reading and it will appear here."
            : "Nothing here yet."}
          <br />
          <Link href="/books" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            Find a book to read &#8594;
          </Link>
        </div>
      ) : (
        <div className="lib-grid">
          {shown.map((b) => {
            const p = progress.get(b.id);
            const href = p && !p.completed ? `/books/${b.id}?ch=${p.chapter_number}` : `/books/${b.id}`;
            const author = (b.profiles as any)?.name as string | undefined;

            return (
              <div key={b.id} className="lib-card">
                <Link href={`/books/${b.id}`} aria-label={b.title}>
                  <BookCover title={b.title} author={author} src={b.cover_image_url} />
                </Link>

                <div className="lib-meta">
                  <Link href={`/books/${b.id}`} className="lib-title">
                    {b.title}
                  </Link>
                  {author && <span className="lib-author">{author}</span>}

                  <div className="lib-tags">
                    {purchased.has(b.id) && <span>Purchased</span>}
                    {b.price_inr === 0 && <span>Free</span>}
                    {p?.completed && <span>Completed</span>}
                  </div>

                  {p && (
                    <div className="lib-progress" aria-label={`${p.percent}% read`}>
                      <div style={{ width: `${p.completed ? 100 : p.percent}%` }} />
                    </div>
                  )}

                  <Link href={href} className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
                    {p && !p.completed && p.percent > 0
                      ? `Continue · ${p.percent}%`
                      : p?.completed
                        ? "Read again"
                        : "Start reading"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
