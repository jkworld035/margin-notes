"use client";

import { useState, useTransition } from "react";
import { toggleBookmark } from "@/app/actions/social";

export default function BookmarkButton({
  postId,
  initialSaved,
  isLoggedIn,
}: {
  postId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setSaved((s) => !s);
    startTransition(() => {
      toggleBookmark(postId);
    });
  }

  return (
    <button
      className={`btn btn-sm ${saved ? "btn-primary" : "btn-ghost"}`}
      onClick={handleClick}
      disabled={isPending}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
