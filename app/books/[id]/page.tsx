import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BookReader from "./book-reader";
import BuyButton from "./buy-button";
import LibraryButton from "./library-button";
import ReviewSection from "./review-section";
import Stars from "../stars";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type Chapter = { id: string; title: string; content: string; chapter_number: number; locked: boolean };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ch?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { ch } = await searchParams;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("title, description, cover_image_url")
    .eq("id", id)
    .single();

  if (!book) return { title: "Book not found — Margin Notes" };

  const url = `${siteUrl}/books/${id}${ch ? `?ch=${ch}` : ""}`;
  return {
    title: `${book.title} — Margin Notes`,
    description: book.description,
    alternates: { canonical: url },
    openGraph: {
      title: book.title,
      description: book.description,
      type: "book",
      url,
      ...(book.cover_image_url ? { images: [{ url: book.cover_image_url }] } : {}),
    },
  };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ch?: string; at?: string }>;
}) {
  const { id } = await params;
  const { ch, at } = await searchParams;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select(
      "id, title, description, cover_image_url, status, author_id, price_inr, preview_chapters, profiles!books_author_id_fkey(name)"
    )
    .eq("id", id)
    .single();

  if (!book) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthor = user?.id === book.author_id;
  if (book.status !== "published" && !isAuthor) notFound();

  const isPaid = book.price_inr > 0;

  // Has this reader paid for the book?
  let owned = false;
  if (isPaid && user && !isAuthor) {
    const { data: purchase } = await supabase
      .from("book_purchases")
      .select("id")
      .eq("book_id", id)
      .eq("buyer_id", user.id)
      .eq("status", "paid")
      .maybeSingle();
    owned = !!purchase;
  }
  const hasFullAccess = !isPaid || isAuthor || owned;

  // The database (RLS) only returns chapters this reader is allowed to read.
  const { data: readable } = await supabase
    .from("book_chapters")
    .select("id, title, content, chapter_number")
    .eq("book_id", id)
    .order("chapter_number", { ascending: true });

  let list: Chapter[] = (readable || []).map((c) => ({ ...c, locked: false }));

  // For a paid book the reader hasn't bought, also list the locked chapters —
  // titles only, never their content — so the contents page shows the full book.
  if (!hasFullAccess) {
    try {
      const admin = createAdminClient();
      const { data: titles } = await admin
        .from("book_chapters")
        .select("id, title, chapter_number")
        .eq("book_id", id)
        .order("chapter_number", { ascending: true });

      const readableById = new Map(list.map((c) => [c.id, c]));
      list = (titles || []).map(
        (t) => readableById.get(t.id) || { id: t.id, title: t.title, chapter_number: t.chapter_number, content: "", locked: true }
      );
    } catch {
      // Service role key not configured — fall back to just the readable chapters.
    }
  }

  // Reading progress + library state (empty if the library tables don't exist yet).
  let progress: { chapter_number: number; chapter_fraction: number; percent: number; completed: boolean } | null = null;
  let savedInLibrary = false;
  let marks: { id: string; kind: "bookmark" | "highlight"; chapter_number: number; chapter_fraction: number; quote: string | null }[] = [];
  if (user) {
    const { data: pr } = await supabase
      .from("reading_progress")
      .select("chapter_number, chapter_fraction, percent, completed")
      .eq("user_id", user.id)
      .eq("book_id", id)
      .maybeSingle();
    progress = pr;

    const { data: lib } = await supabase
      .from("library_books")
      .select("book_id")
      .eq("user_id", user.id)
      .eq("book_id", id)
      .maybeSingle();
    savedInLibrary = !!lib;

    const { data: markRows } = await supabase
      .from("reader_marks")
      .select("id, kind, chapter_number, chapter_fraction, quote")
      .eq("user_id", user.id)
      .eq("book_id", id)
      .order("chapter_number", { ascending: true })
      .order("chapter_fraction", { ascending: true });
    marks = markRows || [];
  }

  const currentNum = ch ? parseInt(ch, 10) : null;
  const initialIndex = currentNum ? list.findIndex((c) => c.chapter_number === currentNum) : -1;

  // Chapter reading view — hands off to the animated client-side page-turn reader
  if (initialIndex >= 0) {
    return (
      <div style={{ padding: "clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,3rem)" }}>
        <BookReader
          bookId={book.id}
          bookTitle={book.title}
          chapters={list}
          initialIndex={initialIndex}
          priceInr={book.price_inr}
          isLoggedIn={!!user}
          initialMarks={marks}
          initialFraction={
            at !== undefined && Number.isFinite(Number(at))
              ? Math.min(1, Math.max(0, Number(at)))
              : progress && progress.chapter_number === list[initialIndex].chapter_number
                ? Number(progress.chapter_fraction)
                : undefined
          }
        />
      </div>
    );
  }

  // Ratings and reviews (empty if the reviews table doesn't exist yet).
  const { data: ratingRows } = await supabase
    .from("book_reviews")
    .select("rating")
    .eq("book_id", id);
  const ratingCount = ratingRows?.length ?? 0;
  const ratingAverage =
    ratingCount > 0 ? ratingRows!.reduce((s, r) => s + r.rating, 0) / ratingCount : 0;

  const { data: reviewRows } = await supabase
    .from("book_reviews")
    .select("id, user_id, rating, review, created_at, profiles!book_reviews_user_id_fkey(name)")
    .eq("book_id", id)
    .order("created_at", { ascending: false })
    .limit(30);
  const reviews = (reviewRows || []).map((r: any) => ({
    id: r.id as string,
    user_id: r.user_id as string,
    rating: r.rating as number,
    review: r.review as string,
    created_at: r.created_at as string,
    name: (r.profiles?.name as string | null) ?? null,
  }));
  const myReview = user ? reviews.find((r) => r.user_id === user.id) ?? null : null;

  const resumeChapter =
    progress && !progress.completed && list.some((c) => c.chapter_number === progress!.chapter_number && !c.locked)
      ? progress.chapter_number
      : list[0]?.chapter_number;

  // Cover / table-of-contents view
  return (
    <div className="post-view">
      <Link href="/books" className="post-view-back">
        &#8592; All books
      </Link>

      {book.status !== "published" && (
        <span className="post-card-status status-pending" style={{ marginBottom: "1rem", display: "inline-block" }}>
          draft — only visible to you
        </span>
      )}

      {book.cover_image_url && (
        <img
          src={book.cover_image_url}
          alt={book.title}
          style={{ width: "100%", maxHeight: "360px", objectFit: "cover", marginBottom: "2rem" }}
        />
      )}

      <div className="book-cover">
        <span className="book-cover-eyebrow">A Book on Margin Notes</span>
        <h1>{book.title}</h1>
        <div className="book-cover-byline">
          by{" "}
          <Link href={`/author/${book.author_id}`} style={{ color: "inherit" }}>
            {(book.profiles as any)?.name}
          </Link>
        </div>
        {ratingCount > 0 && (
          <div style={{ marginTop: ".7rem", display: "flex", gap: ".5rem", justifyContent: "center", alignItems: "center", fontSize: ".85rem", color: "var(--muted)" }}>
            <Stars value={ratingAverage} />
            <span>
              {ratingAverage.toFixed(1)} · {ratingCount} {ratingCount === 1 ? "rating" : "ratings"}
            </span>
          </div>
        )}
        {book.description && <p className="book-cover-desc">{book.description}</p>}

        <div style={{ marginTop: "1.6rem" }}>
          {!isPaid && (
            <span style={{ fontSize: ".78rem", fontWeight: 600, letterSpacing: ".1em", color: "var(--green)" }}>
              FREE TO READ
            </span>
          )}

          {isPaid && !isAuthor && !owned && (
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: ".6rem" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: "1.8rem" }}>₹{book.price_inr}</div>
              <BuyButton bookId={book.id} priceInr={book.price_inr} isLoggedIn={!!user} />
              <span style={{ fontSize: ".78rem", color: "var(--muted)" }}>
                {book.preview_chapters === 0
                  ? "This book has no free preview."
                  : book.preview_chapters === 1
                    ? "The first chapter is free to read as a preview."
                    : `The first ${book.preview_chapters} chapters are free to read as a preview.`}
              </span>
            </div>
          )}

          {isPaid && owned && (
            <span style={{ fontSize: ".85rem", fontWeight: 500, color: "var(--green)" }}>
              ✓ You own this book
            </span>
          )}

          {isPaid && isAuthor && (
            <span style={{ fontSize: ".85rem", color: "var(--muted)" }}>Paid book · ₹{book.price_inr}</span>
          )}
        </div>

        {list.some((c) => !c.locked) && (
          <div style={{ marginTop: "1.4rem", display: "flex", gap: ".6rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/books/${book.id}?ch=${resumeChapter}`} className="btn btn-primary">
              {progress && !progress.completed && progress.percent > 0
                ? `Continue Reading · ${progress.percent}%`
                : progress?.completed
                  ? "Read again"
                  : "Start Reading"}
            </Link>
            {user && !isAuthor && <LibraryButton bookId={book.id} initialSaved={savedInLibrary} />}
          </div>
        )}

        {isAuthor && (
          <div style={{ marginTop: "1.4rem" }}>
            <Link href={`/books/${book.id}/edit`} className="btn btn-ghost btn-sm">
              Edit book
            </Link>
          </div>
        )}
      </div>

      <div className="book-toc-heading">Contents</div>

      {list.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: ".9rem", textAlign: "center" }}>No chapters yet.</p>
      ) : (
        <nav className="book-toc">
          {list.map((c) => (
            <Link key={c.id} href={`/books/${book.id}?ch=${c.chapter_number}`} className="book-toc-item">
              <span className="book-toc-num">{c.chapter_number}</span>
              <span className="book-toc-title">{c.title}</span>
              <span className="book-toc-leader" />
              {c.locked && <span aria-label="Locked" title="Buy this book to read">🔒</span>}
            </Link>
          ))}
        </nav>
      )}

      {book.status === "published" && (
        <ReviewSection
          bookId={book.id}
          reviews={reviews}
          average={ratingAverage}
          count={ratingCount}
          myReview={myReview ? { rating: myReview.rating, review: myReview.review } : null}
          isLoggedIn={!!user}
          isAuthor={isAuthor}
        />
      )}
    </div>
  );
}
