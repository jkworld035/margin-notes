"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "@/app/actions/social";

export default function LikeButton({
  postId,
  initialCount,
  initialLiked,
  isLoggedIn,
}: {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    // optimistic update
    setLiked((l) => !l);
    setCount((c) => (liked ? c - 1 : c + 1));
    startTransition(() => {
      toggleLike(postId);
    });
  }

  return (
    <button
      className={`btn btn-sm ${liked ? "btn-primary" : "btn-ghost"}`}
      onClick={handleClick}
      disabled={isPending}
      style={{ gap: ".4rem" }}
    >
      {liked ? "♥" : "♡"} {count > 0 ? count : ""} {count === 1 ? "Clap" : "Claps"}
    </button>
  );
}
