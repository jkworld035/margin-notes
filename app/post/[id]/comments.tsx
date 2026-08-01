"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addComment, deleteComment } from "@/app/actions/social";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: { name: string } | null;
};

export default function Comments({
  postId,
  initialComments,
  isLoggedIn,
  currentUserId,
}: {
  postId: string;
  initialComments: Comment[];
  isLoggedIn: boolean;
  currentUserId: string | null;
}) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await addComment(postId, text);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setText("");
    // optimistic-ish: just refresh via a temp local entry; the revalidated page data will reconcile on next nav
    window.location.reload();
  }

  return (
    <div style={{ marginTop: "3rem", borderTop: "1px solid var(--rule)", paddingTop: "2rem" }}>
      <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.3rem", marginBottom: "1.2rem" }}>
        {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
      </h2>

      {isLoggedIn ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a comment…"
              maxLength={1000}
              style={{ minHeight: "90px" }}
              required
            />
          </div>
          <button className="btn btn-primary btn-sm" type="submit">
            Post Comment
          </button>
        </form>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: ".9rem", marginBottom: "2rem" }}>
          <Link href="/login" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
        {comments.map((c) => (
          <div key={c.id} style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1.2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 500, fontSize: ".9rem" }}>{c.profiles?.name || "Someone"}</span>
              <span style={{ color: "var(--muted)", fontSize: ".75rem" }}>
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
            <p style={{ fontSize: ".92rem", marginTop: ".3rem", fontWeight: 300 }}>{c.content}</p>
            {c.author_id === currentUserId && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: ".4rem" }}
                disabled={isPending}
                onClick={() => {
                  setComments((cs) => cs.filter((x) => x.id !== c.id));
                  startTransition(() => {
                    deleteComment(c.id, postId);
                  });
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
