import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BookReader from "./book-reader";
import BuyButton from "./buy-button";

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
  searchParams: Promise<{ ch?: string }>;
}) {
  const { id } = await params;
  const { ch } = await searchParams;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select(
      "id, title, description, cover_image_url, status, author_id, price_inr, profiles!books_author_id_fkey(name)"
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
        />
      </div>
    );
  }

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
                The first chapter is free to read as a preview.
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
    </div>
  );
}
