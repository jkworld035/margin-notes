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

  // Table of contents view
  if (!current) {
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
        <h1>{book.title}</h1>
        <div className="post-view-meta">
          <Link href={`/author/${book.author_id}`} style={{ color: "inherit", textDecoration: "none" }}>
            {(book.profiles as any)?.name}
          </Link>
          <span className="meta-dot">·</span>
          <span>
            {list.length} chapter{list.length === 1 ? "" : "s"}
          </span>
          {isAuthor && (
            <>
              <span className="meta-dot">·</span>
              <Link href={`/books/${book.id}/edit`} style={{ color: "var(--accent)" }}>
                Edit book
              </Link>
            </>
          )}
        </div>

        {book.cover_image_url && (
          <img
            src={book.cover_image_url}
            alt={book.title}
            style={{ width: "100%", maxHeight: "400px", objectFit: "cover", marginBottom: "2rem" }}
          />
        )}

        {book.description && <div className="post-view-body">{renderContent(book.description)}</div>}

        <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.3rem", margin: "2.5rem 0 1rem" }}>
          Contents
        </h2>

        {list.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>No chapters yet.</p>
        ) : (
          <div className="admin-post-list">
            {list.map((c) => (
              <Link
                key={c.id}
                href={`/books/${book.id}?ch=${c.chapter_number}`}
                className="admin-post-item"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="admin-post-info">
                  <div className="admin-post-title">
                    <span style={{ color: "var(--muted)", marginRight: ".6rem" }}>{c.chapter_number}.</span>
                    {c.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single chapter reading view
  return (
    <div className="post-view">
      <Link href={`/books/${book.id}`} className="post-view-back">
        &#8592; {book.title}
      </Link>
      <span className="post-view-tag">Chapter {current.chapter_number}</span>
      <h1>{current.title}</h1>
      <div className="post-view-meta">
        <Link href={`/author/${book.author_id}`} style={{ color: "inherit", textDecoration: "none" }}>
          {(book.profiles as any)?.name}
        </Link>
      </div>

      <div className="post-view-body">{renderContent(current.content)}</div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: ".6rem",
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--rule)",
        }}
      >
        {prev ? (
          <Link href={`/books/${book.id}?ch=${prev.chapter_number}`} className="btn btn-ghost btn-sm">
            &#8592; {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/books/${book.id}?ch=${next.chapter_number}`} className="btn btn-primary btn-sm">
            {next.title} &#8594;
          </Link>
        ) : (
          <Link href={`/books/${book.id}`} className="btn btn-ghost btn-sm">
            Back to contents
          </Link>
        )}
      </div>
    </div>
  );
}
