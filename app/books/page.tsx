import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Books — Margin Notes",
  description: "Long-form original books, written chapter by chapter.",
  alternates: { canonical: `${siteUrl}/books` },
};

export default async function BooksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: books } = await supabase
    .from("books")
    .select("id, title, description, cover_image_url, created_at, profiles!books_author_id_fkey(name)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="hero">
        <span className="hero-eyebrow">Margin Notes</span>
        <h1>
          Books worth
          <br />
          <em>finishing</em>
        </h1>
        <p>Original long-form works, written and published chapter by chapter by their authors.</p>
      </div>

      <div className="posts-section">
        <div className="section-bar">
          <h2>Published Books</h2>
          {user && (
            <Link href="/books/new" className="btn btn-primary btn-sm">
              + Start a Book
            </Link>
          )}
        </div>

        <div className="posts-grid">
          {!books || books.length === 0 ? (
            <div className="empty-state">
              No books published yet.
              {user && (
                <>
                  <br />
                  <Link
                    href="/books/new"
                    style={{
                      color: "var(--accent)",
                      fontWeight: 500,
                      fontSize: ".9rem",
                      marginTop: ".5rem",
                      textDecoration: "underline",
                      display: "inline-block",
                    }}
                  >
                    Start the first one &#8594;
                  </Link>
                </>
              )}
            </div>
          ) : (
            books.map((b: any) => (
              <Link key={b.id} href={`/books/${b.id}`} className="post-card">
                {b.cover_image_url && (
                  <div style={{ position: "relative", width: "100%", height: "180px", marginBottom: ".4rem" }}>
                    <img
                      src={b.cover_image_url}
                      alt={b.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}
                <span className="post-card-tag">Book</span>
                <div className="post-card-title">{b.title}</div>
                <div className="post-card-excerpt">{b.description}</div>
                <div className="post-card-meta">
                  <span>{b.profiles?.name}</span>
                  <span className="meta-dot">·</span>
                  <span>{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
