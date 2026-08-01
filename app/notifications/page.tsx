import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MarkReadOnView from "./mark-read-on-view";

function messageFor(type: string) {
  if (type === "follow") return "started following you";
  if (type === "like") return "clapped for your story";
  if (type === "comment") return "commented on your story";
  return "";
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, read, created_at, post_id, actor_id, actor:profiles!notifications_actor_id_fkey(name), post:posts(title)")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="profile-page">
      <MarkReadOnView />
      <div className="section-bar" style={{ marginBottom: "1.5rem" }}>
        <h2>Notifications</h2>
      </div>

      {!notifications || notifications.length === 0 ? (
        <div className="empty-state">Nothing here yet. Activity on your stories will show up here.</div>
      ) : (
        <div className="admin-post-list">
          {notifications.map((n: any) => {
            const inner = (
              <div className="admin-post-item" key={n.id} style={{ background: n.read ? undefined : "#fdf3ee" }}>
                <div className="admin-post-info">
                  <div className="admin-post-title">
                    <strong>{n.actor?.name || "Someone"}</strong> {messageFor(n.type)}
                    {n.post?.title ? ` — "${n.post.title}"` : ""}
                  </div>
                  <div className="admin-post-sub">
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
            return n.post_id ? (
              <Link key={n.id} href={`/post/${n.post_id}`} style={{ textDecoration: "none", color: "inherit" }}>
                {inner}
              </Link>
            ) : (
              <Link
                key={n.id}
                href={`/author/${n.actor_id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
