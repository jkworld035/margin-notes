import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import EditProfile from "./edit-profile";
import AvatarUpload from "./avatar-upload";
import StoryActions from "./story-actions";
import ShareButton from "@/app/post/[id]/share-button";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "saved" ? "saved" : "stories";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, bio, role, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: myPosts } = await supabase
    .from("posts")
    .select("id, title, excerpt, category, status, created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
  ]);

  let savedPosts: any[] = [];
  if (tab === "saved") {
    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("post_id, posts(id, title, excerpt, category, status, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    savedPosts = (bookmarks || []).map((b: any) => b.posts).filter(Boolean);
  }

  const posts = tab === "saved" ? savedPosts : myPosts || [];

  let viewCounts: Record<string, number> = {};
  if (tab === "stories" && myPosts && myPosts.length > 0) {
    const { data: views } = await supabase
      .from("post_views")
      .select("post_id")
      .in(
        "post_id",
        myPosts.map((p) => p.id)
      );
    (views || []).forEach((v) => {
      viewCounts[v.post_id] = (viewCounts[v.post_id] || 0) + 1;
    });
  }

  return (
    <div className="profile-page">
      <div className="profile-top">
        <AvatarUpload initialUrl={profile?.avatar_url || null} />
        <div style={{ flex: 1 }}>
          <div className="profile-name">{profile?.name}</div>
          <div className="profile-role">{profile?.role === "admin" ? "Administrator" : "Writer"}</div>
          {profile?.bio && (
            <p style={{ color: "var(--muted)", fontSize: ".9rem", marginTop: ".5rem", fontWeight: 300 }}>
              {profile.bio}
            </p>
          )}
          <div className="profile-stats">
            <span>
              <b>{myPosts?.length || 0}</b> stories
            </span>
            <span>
              <b>{followerCount || 0}</b> followers
            </span>
            <span>
              <b>{followingCount || 0}</b> following
            </span>
          </div>
        </div>
        <EditProfile initialName={profile?.name || ""} initialBio={profile?.bio || ""} />
      </div>

      <div className="profile-tabs">
        <Link href="/profile" className={`profile-tab${tab === "stories" ? " active" : ""}`}>
          Stories
        </Link>
        <Link href="/profile?tab=saved" className={`profile-tab${tab === "saved" ? " active" : ""}`}>
          Saved
        </Link>
      </div>

      {tab === "stories" && (
        <div className="section-bar" style={{ marginBottom: "1.5rem" }}>
          <h2>My Stories</h2>
          <Link href="/write" className="btn btn-primary btn-sm">
            + Write New
          </Link>
        </div>
      )}

      <div className="posts-grid">
        {posts.length === 0 ? (
          <div className="empty-state">
            {tab === "saved" ? (
              "No saved stories yet."
            ) : (
              <>
                You haven&apos;t written anything yet.
                <br />
                <Link
                  href="/write"
                  style={{
                    color: "var(--accent)",
                    fontWeight: 500,
                    fontSize: ".9rem",
                    marginTop: ".5rem",
                    textDecoration: "underline",
                    display: "inline-block",
                  }}
                >
                  Write your first story &#8594;
                </Link>
              </>
            )}
          </div>
        ) : (
          posts.map((p: any) => {
            const clickable = p.status === "approved";
            const inner = (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="post-card-tag">{p.category}</span>
                  {p.status === "rejected" && (
                    <span className="post-card-status status-rejected">taken down</span>
                  )}
                </div>
                <div className="post-card-title">{p.title}</div>
                <div className="post-card-excerpt">{p.excerpt}</div>
                <div className="post-card-meta">
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  {tab === "stories" && (
                    <>
                      <span className="meta-dot">·</span>
                      <span>{viewCounts[p.id] || 0} views</span>
                    </>
                  )}
                </div>
              </>
            );
            return (
              <div key={p.id} className="post-card" style={{ cursor: "default" }}>
                {clickable ? (
                  <Link href={`/post/${p.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
                {tab === "stories" && (
                  <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                    <StoryActions postId={p.id} />
                    {clickable && <ShareButton postId={p.id} title={p.title} />}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
