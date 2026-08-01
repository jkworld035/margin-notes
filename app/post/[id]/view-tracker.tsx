"use client";

import { useEffect } from "react";
import { logView } from "@/app/actions/social";

export default function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `viewed:${postId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // if sessionStorage isn't available, just log the view anyway
    }
    logView(postId);
  }, [postId]);

  return null;
}
