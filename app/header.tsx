import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions/auth";
import ThemeToggle from "./theme-toggle";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { name: string; role: string; avatar_url: string | null } | null = null;
  let unreadCount = 0;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("name, role, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("read", false);
    unreadCount = count || 0;
  }

  return (
    <header>
      <Link href="/" className="logo">
        Jkworld<span>035</span>
      </Link>
      <form action="/" method="get" className="header-search">
        <input type="text" name="q" placeholder="Search stories, tags…" />
      </form>
      <div className="header-right">
        <ThemeToggle />
        {!user ? (
          <>
            <Link href="/login" className="nav-btn">
              Log In
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Sign Up
            </Link>
          </>
        ) : (
          <>
            <Link href="/write" className="nav-btn">
              Write
            </Link>
            <Link href="/earnings" className="nav-btn">
              Earnings
            </Link>
            {profile?.role === "admin" && (
              <Link href="/admin" className="nav-btn">
                Admin
              </Link>
            )}
            <Link href="/notifications" className="icon-btn" style={{ position: "relative" }} title="Notifications">
              🔔
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--accent)",
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: ".62rem",
                    width: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/profile" className="avatar" title={profile?.name} style={{ overflow: "hidden", padding: 0 }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                (profile?.name || "?")[0].toUpperCase()
              )}
            </Link>
            <form action={signOut}>
              <button className="btn btn-ghost btn-sm" type="submit">
                Log Out
              </button>
            </form>
          </>
        )}
      </div>
    </header>
  );
}
