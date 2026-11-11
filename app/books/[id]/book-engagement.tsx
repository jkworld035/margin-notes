"use client";

import { useEffect, useRef, useState } from "react";
import { clapBook, logBookView, toggleBookLike } from "@/app/actions/book-engagement";

const MAX_CLAPS = 50;

export default function BookEngagement({
  bookId,
  views,
  likes,
  claps,
  myLiked,
  myClaps,
  isLoggedIn,
  canReact,
}: {
  bookId: string;
  views: number;
  likes: number;
  claps: number;
  myLiked: boolean;
  myClaps: number;
  isLoggedIn: boolean;
  canReact: boolean; // false for the book's own author
}) {
  const [liked, setLiked] = useState(myLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [mine, setMine] = useState(myClaps);
  const [total, setTotal] = useState(claps);
  const [viewCount, setViewCount] = useState(views);
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Count one view per browser session.
  useEffect(() => {
    const key = `book-viewed:${bookId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // still count it
    }
    logBookView(bookId);
    setViewCount((v) => v + 1);
  }, [bookId]);

  // Send pending claps in one batch after the reader stops tapping.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function guard() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return false;
    }
    return canReact;
  }

  async function onLike() {
    if (!guard()) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await toggleBookLike(bookId);
    if ("error" in res && res.error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  function onClap() {
    if (!guard()) return;
    if (mine + pending.current >= MAX_CLAPS) return;
    pending.current += 1;
    setMine((m) => m + 1);
    setTotal((t) => t + 1);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const amount = pending.current;
      pending.current = 0;
      if (amount < 1) return;
      const res = await clapBook(bookId, amount);
      if ("error" in res && res.error) {
        setMine((m) => Math.max(0, m - amount));
        setTotal((t) => Math.max(0, t - amount));
      }
    }, 700);
  }

  return (
    <div className="engage" aria-label="Book reactions">
      <span className="engage-stat" title="Views">👁 {viewCount.toLocaleString("en-IN")} {viewCount === 1 ? "view" : "views"}</span>
      <button type="button" className={`btn btn-sm ${liked ? "btn-primary" : "btn-ghost"}`} onClick={onLike} aria-pressed={liked}>
        {liked ? "♥" : "♡"} {likeCount > 0 ? likeCount.toLocaleString("en-IN") : ""} {likeCount === 1 ? "Like" : "Likes"}
      </button>
      <button type="button" className={`btn btn-sm ${mine > 0 ? "btn-primary" : "btn-ghost"}`} onClick={onClap} title={canReact ? "Tap to clap — up to 50 times" : undefined}>
        👏 {total > 0 ? total.toLocaleString("en-IN") : ""} {total === 1 ? "Clap" : "Claps"}
        {mine > 0 && <span className="engage-mine">+{mine}</span>}
      </button>
    </div>
  );
}
