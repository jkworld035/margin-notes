import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { estimateReadTime } from "./actions/posts";
import AdSlot from "./ad-slot";

const CATEGORIES = [
  "All",
  "Essays",
  "Design",
  "Technology",
  "Culture",
  "Business",
  "Health",
  "Travel",
  "Lifestyle",
  "Science",
  "Education",
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string; q?: string }>;
}) {
  const { category, tag, q } = await searchParams;
  const active = category || "All";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let posts: any[] | null = null;
  let sectionTitle = "Latest Stories";

  if (q) {
    sectionTitle = `Results for "${q}"`;
    const { data } = await supabase
      .from("posts")
      .select("id, title, excerpt, category, created_at, content, cover_image_url, tags, profiles!posts_author_id_fkey(name)")
      .eq("status", "approved")
      .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
      .order("created_at", { ascending: false });
    posts = data;
  } else if (tag) {
    sectionTitle = `Tagged "${tag}"`;
    const { data } = await supabase
      .from("posts")
      .select("id, title, excerpt, category, created_at, content, cover_image_url, tags, profiles!posts_author_id_fkey(name)")
      .eq("status", "approved")
      .contains("tags", [tag])
      .order("created_at", { ascending: false });
    posts = data;
  } else if (active === "Following" && user) {
    sectionTitle = "From people you follow";
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const ids = (following || []).map((f) => f.following_id);

    if (ids.length === 0) {
      posts = [];
    } else {
      const { data } = await supabase
        .from("posts")
        .select("id, title, excerpt, category, created_at, content, cover_image_url, tags, profiles!posts_author_id_fkey(name)")
        .eq("status", "approved")
        .in("author_id", ids)
        .order("created_at", { ascending: false });
      posts = data;
    }
  } else {
    let query = supabase
      .from("posts")
      .select("id, title, excerpt, category, created_at, content, cover_image_url, tags, profiles!posts_author_id_fkey(name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (active !== "All") query = query.eq("category", active);
    const { data } = await query;
    posts = data;
  }

  // Trending: top 5 by like count among recent posts
  const { data: allApproved } = await supabase
    .from("posts")
    .select("id, title, profiles!posts_author_id_fkey(name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(30);

  let trending: { id: string; title: string; author: string; claps: number }[] = [];
  if (allApproved && allApproved.length > 0) {
    const ids = allApproved.map((p) => p.id);
    const { data: likeRows } = await supabase.from("likes").select("post_id").in("post_id", ids);
    const counts: Record<string, number> = {};
    (likeRows || []).forEach((l) => {
      counts[l.post_id] = (counts[l.post_id] || 0) + 1;
    });
    trending = allApproved
      .map((p) => ({
        id: p.id,
        title: p.title,
        author: (p.profiles as any)?.name || "",
        claps: counts[p.id] || 0,
      }))
      .sort((a, b) => b.claps - a.claps)
      .slice(0, 5);
  }

  // Tag cloud from recent approved posts
  const { data: tagSource } = await supabase
    .from("posts")
    .select("tags")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);
  const tagCounts: Record<string, number> = {};
  (tagSource || []).forEach((p) => {
    (p.tags || []).forEach((t: string) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([t]) => t);

  return (
    <div>
      <div className="hero">
        <span className="hero-eyebrow">Welcome to Margin Notes</span>
        <h1>
          Stories worth
          <br />
          <em>sharing</em>
        </h1>
        <p>
          Read, write, and discover long-form essays from writers around the world. No gatekeepers — publish
          the moment you hit the button.
        </p>
      </div>

      <div className="layout">
        <div>
          <div className="section-bar">
            <h2>{sectionTitle}</h2>
          </div>
          <div className="filter-tabs">
            {user && (
              <Link
                href="/?category=Following"
                className={`filter-tab${active === "Following" && !q && !tag ? " active" : ""}`}
              >
                Following
              </Link>
            )}
            {CATEGORIES.map((c) => (
              <Link
                key={c}
                href={c === "All" ? "/" : `/?category=${c}`}
                className={`filter-tab${active === c && !q && !tag ? " active" : ""}`}
              >
                {c === "Technology" ? "Tech" : c}
              </Link>
            ))}
          </div>

          <div className="posts-grid">
            {!posts || posts.length === 0 ? (
              <div className="empty-state">
                {active === "Following" && !q && !tag
                  ? "You're not following anyone yet — visit an author's page to follow them."
                  : "No stories here yet."}
              </div>
            ) : (
              posts.map((p: any) => (
                <Link key={p.id} href={`/post/${p.id}`} className="post-card">
                  {p.cover_image_url && (
                    <img
                      src={p.cover_image_url}
                      alt=""
                      style={{ width: "100%", height: "140px", objectFit: "cover", marginBottom: ".4rem" }}
                    />
                  )}
                  <span className="post-card-tag">{p.category}</span>
                  <div className="post-card-title">{p.title}</div>
                  <div className="post-card-excerpt">{p.excerpt}</div>
                  <div className="post-card-meta">
                    <span>{p.profiles?.name}</span>
                    <span className="meta-dot">·</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    <span className="meta-dot">·</span>
                    <span>{estimateReadTime(p.content)} read</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <aside className="sidebar">
          <AdSlot slot="1111111111" />
          <div>
            <h3>Trending</h3>
            {trending.length === 0 ? (
              <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>Nothing trending yet.</p>
            ) : (
              trending.map((t, i) => (
                <div className="trending-item" key={t.id}>
                  <span className="trending-num">{i + 1}</span>
                  <div>
                    <Link href={`/post/${t.id}`} className="trending-title">
                      {t.title}
                    </Link>
                    <div className="trending-sub">
                      {t.author} · {t.claps} claps
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div>
            <h3>Explore tags</h3>
            <div className="tag-cloud">
              {topTags.length === 0 ? (
                <p style={{ fontSize: ".82rem", color: "var(--muted)" }}>No tags yet.</p>
              ) : (
                topTags.map((t) => (
                  <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="tag-chip">
                    {t}
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
