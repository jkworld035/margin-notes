"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deletePost } from "@/app/actions/posts";

export default function StoryActions({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: ".4rem", marginTop: ".6rem" }} onClick={(e) => e.preventDefault()}>
      <Link href={`/write/${postId}`} className="btn btn-ghost btn-sm">
        Edit
      </Link>
      <button
        className="btn btn-danger btn-sm"
        disabled={isPending}
        onClick={() => {
          if (confirm("Delete this story permanently?")) {
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
