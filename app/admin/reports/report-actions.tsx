"use client";

import { useTransition } from "react";
import { resolveReport, adminDeletePost, adminDeleteComment } from "@/app/actions/admin";

export default function ReportActions({
  reportId,
  postId,
  commentId,
}: {
  reportId: string;
  postId: string | null;
  commentId: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="admin-post-actions">
      {postId && (
        <button
          className="btn btn-danger btn-sm"
          disabled={isPending}
          onClick={() => {
            if (confirm("Delete the reported post?")) {
              startTransition(() => {
                adminDeletePost(postId);
                resolveReport(reportId, "resolved");
              });
            }
          }}
        >
          Delete Post
        </button>
      )}
      {commentId && (
        <button
          className="btn btn-danger btn-sm"
          disabled={isPending}
          onClick={() => {
            if (confirm("Delete the reported comment?")) {
              startTransition(() => {
                adminDeleteComment(commentId);
                resolveReport(reportId, "resolved");
              });
            }
          }}
        >
          Delete Comment
        </button>
      )}
      <button
        className="btn btn-neutral btn-sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            resolveReport(reportId, "resolved");
          })
        }
      >
        Mark Resolved
      </button>
      <button
        className="btn btn-ghost btn-sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => {
            resolveReport(reportId, "dismissed");
          })
        }
      >
        Dismiss
      </button>
    </div>
  );
}
