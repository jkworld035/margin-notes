import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { estimateReadTime } from "@/app/actions/posts";
import FollowButton from "./follow-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: author } = await supabase.from("profiles").select("name, bio").eq("id", id).single();

  if (!author) return { title: "Author not found — Margin Notes" };

  const description = author.bio || `Read stories by ${author.name} on Margin Notes.`;

  return {
    title: `${author.name} — Margin Notes`,
    description,
    openGraph: {
      title: `${author.name} on Margin Notes`,
      description,
      type: "profile",
    },
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: author } = await supabase.from("profiles").select("id, name, bio").eq("id", id).single();
  if (!author) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: posts }, { count: followerCount }, { data: myFollow }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, excerpt, category, created_at, content, cover_image_url")
      .eq("author_id", id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
    user
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="profile-page">
      <div className="profile-top">
        <div className="profile-avatar-lg">{author.name[0].toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div className="profile-name">{author.name}</div>
          <div className="profile-role">
            {followerCount || 0} {followerCount === 1 ? "follower" : "followers"}
          </div>
          {author.bio && (
            <p style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: ".5rem", fontWeight: 300 }}>
              {author.bio}
            </p>
          )}
        </div>
        {user && user.id !== id && (
          <FollowButton authorId={id} initialFollowing={!!myFollow} isLoggedIn={!!user} />
        )}
      </div>

      <div className="section-bar" style={{ marginBottom: "1.5rem" }}>
        <h2>Posts</h2>
      </div>
      <div className="posts-grid">
        {!posts || posts.length === 0 ? (
          <div className="empty-state">No published posts yet.</div>
        ) : (
          posts.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} className="post-card">
              <span className="post-card-tag">{p.category}</span>
              <div className="post-card-title">{p.title}</div>
              <div className="post-card-excerpt">{p.excerpt}</div>
              <div className="post-card-meta">
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
                <span className="meta-dot">·</span>
                <span>{estimateReadTime(p.content)} read</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
