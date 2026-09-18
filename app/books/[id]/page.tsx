import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { renderContent } from "@/lib/render-content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("title, description, cover_image_url")
    .eq("id", id)
    .single();

  if (!book) return { title: "Book not found — Margin Notes" };

  const url = `${siteUrl}/books/${id}`;
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
  const current = currentNum ? list.find((c) => c.chapter_number === currentNum) : null;

  const prev = current ? list.find((c) => c.chapter_number === current.chapter_number - 1) : null;
  const next = current ? list.find((c) => c.chapter_number === current.chapter_number + 1) : null;

  // Cover / table-of-contents view
  if (!current) {
    return (
      <div className="post-view">
        <Link href="/books" className="post-view-back">
          &#8592; All books
        </Link>

        {book.status !== "published" && (
          <span
            className="post-card-status status-pending"
            style={{ marginBottom: "1rem", display: "inline-block" }}
          >
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

  // Single chapter — styled as a book page
  return (
    <div style={{ padding: "clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,3rem)" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto 1.5rem" }}>
        <Link href={`/books/${book.id}`} className="post-view-back">
          &#8592; {book.title}
        </Link>
      </div>

      <div className="book-page">
        <div className="book-page-header">
          <span className="book-page-chapter-label">Chapter {current.chapter_number}</span>
          <h1>{current.title}</h1>
          <div className="book-page-rule" />
        </div>

        <div className="book-page-body">{renderContent(current.content)}</div>

        <div className="book-page-number">
          — {current.chapter_number} of {list.length} —
        </div>
      </div>

      <div className="book-page-nav">
        {prev ? (
          <Link href={`/books/${book.id}?ch=${prev.chapter_number}`} className="book-page-nav-btn">
            <span className="book-page-nav-label">&#8592; Previous</span>
            <span className="book-page-nav-title">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/books/${book.id}?ch=${next.chapter_number}`}
            className="book-page-nav-btn book-page-nav-next"
          >
            <span className="book-page-nav-label">Next &#8594;</span>
            <span className="book-page-nav-title">{next.title}</span>
          </Link>
        ) : (
          <Link href={`/books/${book.id}`} className="book-page-nav-btn book-page-nav-next">
            <span className="book-page-nav-label">Finished</span>
            <span className="book-page-nav-title">Back to Contents</span>
          </Link>
        )}
      </div>
    </div>
  );
}
