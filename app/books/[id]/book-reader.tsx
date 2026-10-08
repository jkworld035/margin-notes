"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { renderContent } from "@/lib/render-content";
import BuyButton from "./buy-button";

type Chapter = { id: string; title: string; content: string; chapter_number: number; locked?: boolean };

function ChapterPage({
  chapter,
  total,
  bookId,
  priceInr,
  isLoggedIn,
}: {
  chapter: Chapter;
  total: number;
  bookId: string;
  priceInr: number;
  isLoggedIn: boolean;
}) {
  return (
    <div className="book-page">
      <div className="book-page-header">
        <span className="book-page-chapter-label">Chapter {chapter.chapter_number}</span>
        <h1>{chapter.title}</h1>
        <div className="book-page-rule" />
      </div>

      {chapter.locked ? (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".6rem" }}>🔒</div>
          <p style={{ fontFamily: "var(--serif)", fontSize: "1.15rem", marginBottom: ".4rem" }}>
            You&apos;ve reached the end of the free preview.
          </p>
          <p style={{ color: "var(--muted)", fontSize: ".9rem", marginBottom: "1.4rem" }}>
            Buy this book to keep reading.
          </p>
          <div style={{ display: "inline-block" }}>
            <BuyButton bookId={bookId} priceInr={priceInr} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      ) : (
        <div className="book-page-body">{renderContent(chapter.content)}</div>
      )}

      <div className="book-page-number">
        — {chapter.chapter_number} of {total} —
      </div>
    </div>
  );
}

export default function BookReader({
  bookId,
  bookTitle,
  chapters,
  initialIndex,
  priceInr,
  isLoggedIn,
}: {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
  initialIndex: number;
  priceInr: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const [resetting, setResetting] = useState(false);
  const busy = useRef(false);

  const current = chapters[index];
  const target = direction === "next" ? chapters[index + 1] : direction === "prev" ? chapters[index - 1] : null;

  const go = useCallback(
    (dir: "next" | "prev") => {
      if (busy.current) return;
      const nextIndex = dir === "next" ? index + 1 : index - 1;
      if (nextIndex < 0 || nextIndex >= chapters.length) return;

      busy.current = true;
      setDirection(dir);

      window.setTimeout(() => {
        setIndex(nextIndex);
        setResetting(true);
        setDirection(null);
        router.replace(`/books/${bookId}?ch=${chapters[nextIndex].chapter_number}`, { scroll: false });

        // Drop the "resetting" (no-transition) flag on the next frame so the
        // snapped-back page doesn't animate, then it's ready for the next flip.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setResetting(false);
            busy.current = false;
          });
        });
      }, 620);
    },
    [index, chapters, bookId, router]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") go("next");
      if (e.key === "ArrowLeft") go("prev");
    },
    [go]
  );

  const hasPrev = index > 0;
  const hasNext = index < chapters.length - 1;

  const frontClass = [
    "flip-front",
    direction === "prev" ? "flip-origin-right" : "",
    direction === "next" ? "flip-turning-next" : "",
    direction === "prev" ? "flip-turning-prev" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div style={{ maxWidth: "680px", margin: "0 auto 1.5rem" }}>
        <Link href={`/books/${bookId}`} className="post-view-back">
          &#8592; {bookTitle}
        </Link>
      </div>

      <div className="flip-stage" tabIndex={0} onKeyDown={onKeyDown}>
        {target && (
          <div className="flip-back">
            <ChapterPage chapter={target} total={chapters.length} bookId={bookId} priceInr={priceInr} isLoggedIn={isLoggedIn} />
          </div>
        )}
        <div className={frontClass} style={resetting ? { transition: "none" } : undefined}>
          <ChapterPage chapter={current} total={chapters.length} bookId={bookId} priceInr={priceInr} isLoggedIn={isLoggedIn} />
        </div>
        <div className={`flip-shade${direction ? " flip-shade-on" : ""}`} />
      </div>

      <div className="book-page-nav">
        <button className="book-page-nav-btn" onClick={() => go("prev")} disabled={!hasPrev} type="button">
          <span className="book-page-nav-label">&#8592; Previous</span>
          <span className="book-page-nav-title">{hasPrev ? chapters[index - 1].title : ""}</span>
        </button>
        {hasNext ? (
          <button className="book-page-nav-btn book-page-nav-next" onClick={() => go("next")} type="button">
            <span className="book-page-nav-label">Next &#8594;</span>
            <span className="book-page-nav-title">{chapters[index + 1].title}</span>
          </button>
        ) : (
          <Link href={`/books/${bookId}`} className="book-page-nav-btn book-page-nav-next">
            <span className="book-page-nav-label">Finished</span>
            <span className="book-page-nav-title">Back to Contents</span>
          </Link>
        )}
      </div>
    </div>
  );
}
