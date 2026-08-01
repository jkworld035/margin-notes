"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/actions/social";

export default function FollowButton({
  authorId,
  initialFollowing,
  isLoggedIn,
}: {
  authorId: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setFollowing((f) => !f);
    startTransition(() => {
      toggleFollow(authorId);
    });
  }

  return (
    <button
      className={`btn btn-sm ${following ? "btn-neutral" : "btn-primary"}`}
      onClick={handleClick}
      disabled={isPending}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
