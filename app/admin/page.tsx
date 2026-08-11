import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminActions from "./admin-actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam || "published";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: allPosts } = await supabase
    .from("posts")
    .select("id, title, category, created_at, status, profiles!posts_author_id_fkey(name)")
    .order("created_at", { ascending: false });

  const posts = allPosts || [];
  const published = posts.filter((p) => p.status === "approved");
  const takenDown = posts.filter((p) => p.status === "rejected");

  const shown = tab === "removed" ? takenDown : published;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Moderation</h2>
        <p>Every post publishes instantly. Use this to take down anything that violates guidelines.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{posts.length}</div>
          <div className="stat-label">Total Posts</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{published.length}</div>
          <div className="stat-label">Published</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{takenDown.length}</div>
          <div className="stat-label">Taken Down</div>
        </div>
      </div>

      <div className="admin-tabs">
        <span className="admin-tab active">Posts</span>
        <Link href="/admin/members" className="admin-tab">
          Members
        </Link>
        <Link href="/admin/reports" className="admin-tab">
          Reports
        </Link>
      </div>

      <div className="admin-tabs">
        <Link href="/admin?tab=published" className={`admin-tab${tab === "published" ? " active" : ""}`}>
          Published
        </Link>
        <Link href="/admin?tab=removed" className={`admin-tab${tab === "removed" ? " active" : ""}`}>
          Taken Down
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="admin-post-list">
          <div className="empty-state" style={{ gridColumn: "unset", padding: "2rem" }}>
            No posts here.
          </div>
        </div>
      ) : (
        <div className="admin-post-list">
          {shown.map((p: any) => (
            <div className="admin-post-item" key={p.id}>
              <div className="admin-post-info">
                <div className="admin-post-title">{p.title}</div>
                <div className="admin-post-sub">
                  <span>{p.profiles?.name}</span>
                  <span>·</span>
                  <span>{p.category}</span>
                  <span>·</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <AdminActions postId={p.id} status={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
