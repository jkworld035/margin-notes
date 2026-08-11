"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addComment, deleteComment } from "@/app/actions/social";
import ReportButton from "./report-button";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  parent_id: string | null;
  profiles: { name: string } | null;
};

function buildTree(comments: Comment[]) {
  const byParent: Record<string, Comment[]> = {};
  comments.forEach((c) => {
    const key = c.parent_id || "root";
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  });
  return byParent;
}

function CommentItem({
  comment,
  byParent,
  postId,
  currentUserId,
  isLoggedIn,
  isPending,
  startTransition,
  onDeleted,
  depth,
}: {
  comment: Comment;
  byParent: Record<string, Comment[]>;
  postId: string;
  currentUserId: string | null;
  isLoggedIn: boolean;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onDeleted: (id: string) => void;
  depth: number;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const replies = byParent[comment.id] || [];

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await addComment(postId, replyText, comment.id);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setReplying(false);
    setReplyText("");
    window.location.reload();
  }

  return (
    <div style={{ marginLeft: depth > 0 ? "1.6rem" : 0 }}>
      <div style={{ borderBottom: "1px solid var(--rule)", paddingBottom: "1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontWeight: 500, fontSize: ".9rem" }}>{comment.profiles?.name || "Someone"}</span>
          <span style={{ color: "var(--muted)", fontSize: ".75rem" }}>
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>
        <p style={{ fontSize: ".92rem", marginTop: ".3rem", fontWeight: 300 }}>{comment.content}</p>
        <div style={{ display: "flex", gap: ".4rem", marginTop: ".4rem" }}>
          {isLoggedIn && (
            <button className="btn btn-ghost btn-sm" onClick={() => setReplying((r) => !r)}>
              Reply
            </button>
          )}
          {comment.author_id === currentUserId && (
            <button
              className="btn btn-ghost btn-sm"
              disabled={isPending}
              onClick={() => {
                onDeleted(comment.id);
                startTransition(() => {
                  deleteComment(comment.id, postId);
                });
              }}
            >
              Delete
            </button>
          )}
          <ReportButton commentId={comment.id} />
        </div>

        {replying && (
          <form onSubmit={handleReply} style={{ marginTop: ".8rem" }}>
            {error && <div className="form-error">{error}</div>}
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply…"
              maxLength={1000}
              style={{ minHeight: "60px" }}
              required
            />
            <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: ".4rem" }}>
              Post Reply
            </button>
          </form>
        )}
      </div>

      {replies.map((r) => (
        <CommentItem
          key={r.id}
          comment={r}
          byParent={byParent}
          postId={postId}
          currentUserId={currentUserId}
          isLoggedIn={isLoggedIn}
          isPending={isPending}
          startTransition={startTransition}
          onDeleted={onDeleted}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

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
    window.location.reload();
  }

  function onDeleted(id: string) {
    setComments((cs) => cs.filter((x) => x.id !== id && x.parent_id !== id));
  }

  const byParent = buildTree(comments);
  const topLevel = byParent["root"] || [];

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

      <div style={{ display: "flex", flexDirection: "column" }}>
        {topLevel.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            byParent={byParent}
            postId={postId}
            currentUserId={currentUserId}
            isLoggedIn={isLoggedIn}
            isPending={isPending}
            startTransition={startTransition}
            onDeleted={onDeleted}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}
