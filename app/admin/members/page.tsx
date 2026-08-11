import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MemberActions from "./member-actions";

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, name, email, role, suspended, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Members</h2>
        <p>Manage user accounts. Suspending blocks new posts, comments, likes, and follows.</p>
      </div>

      <div className="admin-tabs">
        <Link href="/admin" className="admin-tab">
          Posts
        </Link>
        <Link href="/admin/members" className="admin-tab active">
          Members
        </Link>
        <Link href="/admin/reports" className="admin-tab">
          Reports
        </Link>
      </div>

      <div className="admin-post-list">
        {(members || []).map((m) => (
          <div className="admin-post-item" key={m.id}>
            <div className="admin-post-info">
              <div className="admin-post-title">
                {m.name}
                {m.id === user.id && (
                  <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: ".8rem" }}> (you)</span>
                )}
              </div>
              <div className="admin-post-sub">
                <span>{m.email}</span>
                <span>·</span>
                <span>Joined {new Date(m.created_at).toLocaleDateString()}</span>
                {m.role === "admin" && <span className="post-card-status status-approved">admin</span>}
                {m.suspended && <span className="post-card-status status-rejected">suspended</span>}
              </div>
            </div>
            {m.id !== user.id && <MemberActions userId={m.id} suspended={m.suspended} role={m.role} />}
          </div>
        ))}
      </div>
    </div>
  );
}
