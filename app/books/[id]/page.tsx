import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import BookReader from "./book-reader";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
    .select("id, title, description, cover_image_url, status, author_id, profiles!books_author_id_fkey(name)")
    .eq("id", id)
    .single();

  if (!book) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthor = user?.id === book.author_id;
  if (book.status !== "published" && !isAuthor) notFound();

  const { data: chapters } = await supabase
    .from("book_chapters")
    .select("id, title, content, chapter_number")
    .eq("book_id", id)
    .order("chapter_number", { ascending: true });

  const list = chapters || [];
  const currentNum = ch ? parseInt(ch, 10) : null;
  const initialIndex = currentNum ? list.findIndex((c) => c.chapter_number === currentNum) : -1;

  // Chapter reading view — hands off to the animated client-side page-turn reader
  if (initialIndex >= 0) {
    return (
      <div style={{ padding: "clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,3rem)" }}>
        <BookReader bookId={book.id} bookTitle={book.title} chapters={list} initialIndex={initialIndex} />
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
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
