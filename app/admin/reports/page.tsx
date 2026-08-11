import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ReportActions from "./report-actions";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = statusParam === "resolved" ? "resolved" : statusParam === "dismissed" ? "dismissed" : "open";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reason, status, created_at, post_id, comment_id, reporter:profiles!reports_reporter_id_fkey(name), post:posts(id, title), comment:comments(id, content)"
    )
    .eq("status", status)
    .order("created_at", { ascending: false });

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Reports</h2>
        <p>Review flagged posts and comments.</p>
      </div>

      <div className="admin-tabs">
        <span className="admin-tab">
          <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>
            Posts
          </Link>
        </span>
        <span className="admin-tab">
          <Link href="/admin/members" style={{ color: "inherit", textDecoration: "none" }}>
            Members
          </Link>
        </span>
        <span className="admin-tab active">Reports</span>
      </div>

      <div className="admin-tabs">
        <Link href="/admin/reports?status=open" className={`admin-tab${status === "open" ? " active" : ""}`}>
          Open
        </Link>
        <Link
          href="/admin/reports?status=resolved"
          className={`admin-tab${status === "resolved" ? " active" : ""}`}
        >
          Resolved
        </Link>
        <Link
          href="/admin/reports?status=dismissed"
          className={`admin-tab${status === "dismissed" ? " active" : ""}`}
        >
          Dismissed
        </Link>
      </div>

      {!reports || reports.length === 0 ? (
        <div className="admin-post-list">
          <div className="empty-state" style={{ gridColumn: "unset", padding: "2rem" }}>
            No {status} reports.
          </div>
        </div>
      ) : (
        <div className="admin-post-list">
          {reports.map((r: any) => (
            <div className="admin-post-item" key={r.id}>
              <div className="admin-post-info">
                <div className="admin-post-title">
                  {r.post ? `Post: "${r.post.title}"` : `Comment: "${r.comment?.content?.slice(0, 80)}"`}
                </div>
                <div className="admin-post-sub">
                  <span>Reported by {r.reporter?.name || "someone"}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: ".85rem", marginTop: ".4rem", color: "var(--ink)" }}>
                  &ldquo;{r.reason}&rdquo;
                </div>
              </div>
              {status === "open" && (
                <ReportActions reportId={r.id} postId={r.post_id} commentId={r.comment_id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
