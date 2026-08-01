import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const RATE_PER_VIEW = 0.004;

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, created_at")
    .eq("author_id", user.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const ids = (posts || []).map((p) => p.id);

  let totalViews = 0;
  let totalClaps = 0;
  let totalComments = 0;
  const perPost: Record<string, { views: number; claps: number; comments: number }> = {};

  if (ids.length > 0) {
    const [{ data: views }, { data: likes }, { data: comments }] = await Promise.all([
      supabase.from("post_views").select("post_id").in("post_id", ids),
      supabase.from("likes").select("post_id").in("post_id", ids),
      supabase.from("comments").select("post_id").in("post_id", ids),
    ]);

    ids.forEach((id) => {
      perPost[id] = { views: 0, claps: 0, comments: 0 };
    });
    (views || []).forEach((v) => {
      perPost[v.post_id].views++;
      totalViews++;
    });
    (likes || []).forEach((l) => {
      perPost[l.post_id].claps++;
      totalClaps++;
    });
    (comments || []).forEach((c) => {
      perPost[c.post_id].comments++;
      totalComments++;
    });
  }

  const estimatedEarnings = totalViews * RATE_PER_VIEW;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Earnings</h2>
        <p>A preview of the kind of stats a Partner Program would track.</p>
      </div>

      <div className="earnings-banner">
        <strong>This isn&apos;t connected to real payments.</strong> No payment processor is wired up, so
        nothing here is actual money. Turning this into real payouts would require setting up a Stripe
        Connect account under your business (bank details, identity verification, tax forms) — that&apos;s a
        business decision to make separately, outside of what can be built in code alone. What you see below
        is a working preview of the underlying stats: views, claps, and comments per story.
      </div>

      <div className="stats-row">
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
          <div className="stat-label">Total Comments</div>
        </div>
        <div className="stat-card">
          <div className="earnings-num">${estimatedEarnings.toFixed(2)}</div>
          <div className="stat-label">Illustrative Earnings</div>
        </div>
      </div>

      <div className="admin-tabs">
        <span className="admin-tab active">Per Story</span>
      </div>

      {!posts || posts.length === 0 ? (
        <div className="admin-post-list">
          <div className="empty-state" style={{ gridColumn: "unset", padding: "2rem" }}>
            No published stories yet.
          </div>
        </div>
      ) : (
        <div className="admin-post-list">
          {posts.map((p) => (
            <div className="admin-post-item" key={p.id}>
              <div className="admin-post-info">
                <div className="admin-post-title">{p.title}</div>
                <div className="admin-post-sub">
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{perPost[p.id]?.views || 0} views</span>
                  <span>·</span>
                  <span>{perPost[p.id]?.claps || 0} claps</span>
                  <span>·</span>
                  <span>{perPost[p.id]?.comments || 0} comments</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
