"use client";

import { useTransition } from "react";
import { setPostStatus, deletePost } from "@/app/actions/posts";

export default function AdminActions({ postId, status }: { postId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="admin-post-actions">
      {status !== "approved" && (
        <button
          className="btn btn-success btn-sm"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              setPostStatus(postId, "approved");
            })
          }
        >
          Restore
        </button>
      )}
      {status !== "rejected" && (
        <button
          className="btn btn-danger btn-sm"
          disabled={isPending}
          onClick={() =>
            startTransition(() => {
              setPostStatus(postId, "rejected");
            })
          }
        >
          Take Down
        </button>
      )}
      <button
        className="btn btn-danger btn-sm"
        disabled={isPending}
        onClick={() => {
          if (confirm("Delete this post permanently?")) {
            startTransition(() => {
              deletePost(postId);
            });
          }
        }}
      >
        Delete
      </button>
    </div>
  );
}
