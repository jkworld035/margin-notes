import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: myPosts } = await supabase
    .from("posts")
    .select("id, title, status, created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  const ids = (myPosts || []).map((p) => p.id);

  let totalViews = 0;
  let totalClaps = 0;
  let totalComments = 0;

  if (ids.length > 0) {
    const [{ count: views }, { count: claps }, { count: comments }] = await Promise.all([
      supabase.from("post_views").select("*", { count: "exact", head: true }).in("post_id", ids),
      supabase.from("likes").select("*", { count: "exact", head: true }).in("post_id", ids),
      supabase.from("comments").select("*", { count: "exact", head: true }).in("post_id", ids),
    ]);
    totalViews = views || 0;
    totalClaps = claps || 0;
    totalComments = comments || 0;
  }

  const [{ count: followerCount }, { data: recentNotifications }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
    supabase
      .from("notifications")
      .select("id, type, created_at, read, actor:profiles!notifications_actor_id_fkey(name), post:posts(title)")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recentPosts = (myPosts || []).slice(0, 5);

  function notifMessage(type: string) {
    if (type === "follow") return "started following you";
    if (type === "like") return "clapped for your story";
    if (type === "comment") return "commented on your story";
    return "";
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Welcome back, {profile?.name}</h2>
        <p>Here's how your writing is doing.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{myPosts?.length || 0}</div>
          <div className="stat-label">Stories</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalViews}</div>
          <div className="stat-label">Total Views</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalClaps}</div>
          <div className="stat-label">Total Claps</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{totalComments}</div>
          <div className="stat-label">Comments</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{followerCount || 0}</div>
          <div className="stat-label">Followers</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: ".7rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <Link href="/write" className="btn btn-primary btn-sm">
          + Write New Story
        </Link>
        <Link href="/earnings" className="btn btn-ghost btn-sm">
          View Full Stats
        </Link>
        <Link href="/profile" className="btn btn-ghost btn-sm">
          My Profile
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        <div>
          <div className="section-bar" style={{ marginBottom: "1rem" }}>
            <h2>Recent Stories</h2>
          </div>
          {recentPosts.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
              You haven&apos;t written anything yet.
            </p>
          ) : (
            <div className="admin-post-list">
              {recentPosts.map((p) => (
                <Link
                  key={p.id}
                  href={p.status === "approved" ? `/post/${p.id}` : `/write/${p.id}`}
                  className="admin-post-item"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="admin-post-info">
                    <div className="admin-post-title">{p.title}</div>
                    <div className="admin-post-sub">
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      {p.status === "rejected" && (
                        <span className="post-card-status status-rejected">taken down</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="section-bar" style={{ marginBottom: "1rem" }}>
            <h2>Recent Activity</h2>
          </div>
          {!recentNotifications || recentNotifications.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>Nothing yet.</p>
          ) : (
            <div className="admin-post-list">
              {recentNotifications.map((n: any) => (
                <div key={n.id} className="admin-post-item">
                  <div className="admin-post-info">
                    <div className="admin-post-title" style={{ fontSize: ".92rem" }}>
                      <strong>{n.actor?.name || "Someone"}</strong> {notifMessage(n.type)}
                      {n.post?.title ? ` — "${n.post.title}"` : ""}
                    </div>
                    <div className="admin-post-sub">
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                href="/notifications"
                style={{
                  fontSize: ".82rem",
                  color: "var(--accent)",
                  textDecoration: "underline",
                  padding: ".8rem 1.6rem",
                  display: "block",
                  background: "var(--card)",
                }}
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
