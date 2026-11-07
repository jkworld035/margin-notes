"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { renderContent } from "@/lib/render-content";
import BuyButton from "./buy-button";

type Chapter = {
  id: string;
  title: string;
  content: string;
  chapter_number: number;
  locked?: boolean;
};

type ReaderTheme = "paper" | "white" | "night";

const FLIP_DURATION = 420;
const COL_GAP = 48;

type ViewSize = { w: number; h: number };

// Chapter heading + body. Rendered inside a CSS-column container, so the
// browser itself fills each fixed-size page and flows the rest to the next.
function ChapterBody({
  chapter,
  fontSize,
}: {
  chapter: Chapter;
  fontSize: number;
}) {
  const showLabel = !/^\s*chapter\s+\d+/i.test(chapter.title);

  return (
    <>
      <div className="book-page-header">
        {showLabel && (
          <span className="book-page-chapter-label">
            Chapter {chapter.chapter_number}
          </span>
        )}
        <h1>{chapter.title}</h1>
        <div className="book-page-rule" />
      </div>

      <div
        className="book-page-body"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.85,
          overflowWrap: "anywhere",
        }}
      >
        {renderContent(chapter.content)}
      </div>
    </>
  );
}

// Counts how many fixed-size pages a chapter needs (hidden, off-screen).
function ChapterMeasurer({
  chapter,
  fontSize,
  size,
  onCount,
}: {
  chapter: Chapter;
  fontSize: number;
  size: ViewSize;
  onCount: (chapterId: string, pages: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !size.w || !size.h) return;

    const measure = () => {
      const pages = Math.max(
        1,
        Math.round((el.scrollWidth + COL_GAP) / (size.w + COL_GAP))
      );
      onCount(chapter.id, pages);
    };

    measure();

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
    };
  }, [chapter, fontSize, size.w, size.h, onCount]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: -99999,
        top: 0,
        width: size.w,
        height: size.h,
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      <div
        ref={ref}
        className="book-columns"
        style={{ height: size.h, columnGap: COL_GAP }}
      >
        <ChapterBody chapter={chapter} fontSize={fontSize} />
      </div>
    </div>
  );
}

function ChapterPage({
  chapter,
  pageIndex,
  pageNumber,
  bookId,
  priceInr,
  isLoggedIn,
  fontSize,
  size,
  viewRef,
}: {
  chapter: Chapter;
  pageIndex: number;
  pageNumber: number;
  bookId: string;
  priceInr: number;
  isLoggedIn: boolean;
  fontSize: number;
  size: ViewSize;
  viewRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <article className="book-page">
      <div className="book-view" ref={viewRef}>
        {chapter.locked ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: ".6rem" }}>🔒</div>

            <p
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.15rem",
                marginBottom: ".4rem",
              }}
            >
              You&apos;ve reached the end of the free preview.
            </p>

            <p
              style={{
                color: "var(--muted)",
                fontSize: ".9rem",
                marginBottom: "1.4rem",
              }}
            >
              Buy this book to keep reading.
            </p>

            <div style={{ display: "inline-block" }}>
              <BuyButton
                bookId={bookId}
                priceInr={priceInr}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        ) : (
          <div
            className="book-columns"
            style={
              {
                height: size.h || undefined,
                columnGap: COL_GAP,
                "--col-h": size.h ? `${size.h}px` : "100%",
                transform: `translateX(${-pageIndex * (size.w + COL_GAP)}px)`,
              } as React.CSSProperties
            }
          >
            <ChapterBody chapter={chapter} fontSize={fontSize} />
          </div>
        )}
      </div>

      <footer className="book-page-number">
        {chapter.locked ? "Preview" : pageNumber}
      </footer>
    </article>
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

  const safeInitialIndex = Math.max(
    0,
    Math.min(initialIndex, Math.max(0, chapters.length - 1))
  );

  const [index, setIndex] = useState(safeInitialIndex);
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const [resetting, setResetting] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<ReaderTheme>("paper");

  const busy = useRef(false);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragging = useRef(false);
  const lastMove = useRef({ x: 0, t: 0, vx: 0 });
  const [dragDir, setDragDir] = useState<"next" | "prev" | null>(null);
  const [dragP, setDragP] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const activeDir = direction ?? dragDir;

  const [size, setSize] = useState<ViewSize>({ w: 0, h: 0 });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const frontViewRef = useRef<HTMLDivElement>(null);

  const handleCount = useCallback((chapterId: string, pages: number) => {
    setCounts((prev) =>
      prev[chapterId] === pages ? prev : { ...prev, [chapterId]: pages }
    );
  }, []);

  // Track the exact size of one book page's text area.
  useEffect(() => {
    const el = frontViewRef.current;
    if (!el) return;

    const update = () =>
      setSize((prev) =>
        prev.w === el.clientWidth && prev.h === el.clientHeight
          ? prev
          : { w: el.clientWidth, h: el.clientHeight }
      );

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const pagesByChapter = useMemo(
    () =>
      chapters.map((chapter) =>
        Array.from(
          { length: chapter.locked ? 1 : counts[chapter.id] ?? 1 },
          () => ""
        )
      ),
    [chapters, counts]
  );

  const measured = chapters.every(
    (chapter) => chapter.locked || counts[chapter.id] !== undefined
  );

  // Never stay on a page that no longer exists after a resize or font change.
  useEffect(() => {
    if (!measured) return;

    const max = (pagesByChapter[index]?.length ?? 1) - 1;
    if (pageIndex > max) setPageIndex(Math.max(0, max));
  }, [measured, pagesByChapter, index, pageIndex]);

  // Restore the saved reading position.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(
        `margin-notes-reader-${bookId}`
      );

      if (!saved) return;

      const position = JSON.parse(saved) as {
        chapterNumber?: number;
        pageIndex?: number;
      };

      const savedIndex = chapters.findIndex(
        (chapter) => chapter.chapter_number === position.chapterNumber
      );

      if (savedIndex >= 0) {
        const savedChapter = chapters[savedIndex];

        // Never restore the reader directly into a locked chapter.
        if (!savedChapter.locked) {
          setIndex(savedIndex);
          setPageIndex(Math.max(0, position.pageIndex ?? 0));

          router.replace(
            `/books/${bookId}?ch=${savedChapter.chapter_number}`,
            { scroll: false }
          );
        }
      }
    } catch {
      // Ignore unavailable storage or invalid saved progress.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, chapters, router]);

  // Save reading progress whenever the chapter or page changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        `margin-notes-reader-${bookId}`,
        JSON.stringify({
          chapterNumber: chapters[index]?.chapter_number,
          pageIndex,
        })
      );
    } catch {
      // Reading still works when browser storage is unavailable.
    }
  }, [bookId, chapters, index, pageIndex]);

  const current = chapters[index];
  const currentPages = pagesByChapter[index] ?? [""];

  const totalPages = pagesByChapter.reduce(
    (sum, pages) => sum + pages.length,
    0
  );

  const pageNumber =
    pagesByChapter
      .slice(0, index)
      .reduce((sum, pages) => sum + pages.length, 0) +
    pageIndex +
    1;

  const hasPrev = index > 0 || pageIndex > 0;

  const hasNext =
    pageIndex < currentPages.length - 1 || index < chapters.length - 1;

  const targetPosition =
    activeDir === "next"
      ? pageIndex < currentPages.length - 1
        ? { index, pageIndex: pageIndex + 1 }
        : index < chapters.length - 1
          ? { index: index + 1, pageIndex: 0 }
          : null
      : activeDir === "prev"
        ? pageIndex > 0
          ? { index, pageIndex: pageIndex - 1 }
          : index > 0
            ? {
                index: index - 1,
                pageIndex: (pagesByChapter[index - 1]?.length ?? 1) - 1,
              }
            : null
        : null;

  const targetChapter = targetPosition
    ? chapters[targetPosition.index]
    : null;


  // Turn to the next or previous page.
  const go = useCallback(
    (dir: "next" | "prev") => {
      if (busy.current || !chapters.length) return;

      const currentPageCount = pagesByChapter[index]?.length ?? 1;

      let nextIndex = index;
      let nextPageIndex = pageIndex;

      if (dir === "next") {
        if (pageIndex < currentPageCount - 1) {
          nextPageIndex += 1;
        } else if (index < chapters.length - 1) {
          nextIndex += 1;
          nextPageIndex = 0;
        } else {
          return;
        }
      } else {
        if (pageIndex > 0) {
          nextPageIndex -= 1;
        } else if (index > 0) {
          nextIndex -= 1;
          nextPageIndex = (pagesByChapter[nextIndex]?.length ?? 1) - 1;
        } else {
          return;
        }
      }

      busy.current = true;
      setDirection(dir);

      window.setTimeout(() => {
        setIndex(nextIndex);
        setPageIndex(nextPageIndex);
        setDirection(null);
        setResetting(true);

        if (nextIndex !== index) {
          router.replace(
            `/books/${bookId}?ch=${chapters[nextIndex].chapter_number}`,
            { scroll: false }
          );
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setResetting(false);
            busy.current = false;
          });
        });
      }, FLIP_DURATION);
    },
    [bookId, chapters, index, pageIndex, pagesByChapter, router]
  );

  // Start tracking a drag (finger or mouse).
  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (busy.current || snapping) return;

    const target = event.target;

    if (
      target instanceof HTMLElement &&
      target.closest("button, a, input, select, textarea")
    ) {
      swipeStart.current = null;
      return;
    }

    swipeStart.current = {
      x: event.clientX,
      y: event.clientY,
      t: performance.now(),
    };
    dragging.current = false;
    lastMove.current = { x: event.clientX, t: performance.now(), vx: 0 };
  };

  // The page follows the finger once the gesture is clearly horizontal.
  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const start = swipeStart.current;
    if (!start || busy.current) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (!dragging.current) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.3) return;

      const dir = dx < 0 ? "next" : "prev";
      if ((dir === "next" && !hasNext) || (dir === "prev" && !hasPrev)) {
        return;
      }

      dragging.current = true;
      setDragDir(dir);

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture may not be available everywhere.
      }
    }

    const width = event.currentTarget.getBoundingClientRect().width || 1;
    const now = performance.now();
    const dt = Math.max(1, now - lastMove.current.t);

    lastMove.current = {
      x: event.clientX,
      t: now,
      vx: (event.clientX - lastMove.current.x) / dt,
    };

    const wanted = dragDir ?? (dx < 0 ? "next" : "prev");
    const along = wanted === "next" ? -dx : dx;

    setDragP(Math.max(0, Math.min(1, along / (width * 0.9))));
  };

  // Finish the turn, or let the page fall back.
  const handlePointerUp = () => {
    const start = swipeStart.current;
    swipeStart.current = null;

    if (!start || !dragging.current || !dragDir) {
      dragging.current = false;
      return;
    }

    dragging.current = false;

    const dir = dragDir;
    const vx = lastMove.current.vx;
    const flicked = dir === "next" ? vx < -0.5 : vx > 0.5;

    if (dragP > 0.28 || (flicked && dragP > 0.04)) {
      setDragDir(null);
      setDragP(0);
      go(dir);
    } else {
      setSnapping(true);
      setDragP(0);

      window.setTimeout(() => {
        setDragDir(null);
        setSnapping(false);
      }, 300);
    }
  };

  const handlePointerCancel = () => {
    swipeStart.current = null;

    if (dragging.current) {
      dragging.current = false;
      setSnapping(true);
      setDragP(0);

      window.setTimeout(() => {
        setDragDir(null);
        setSnapping(false);
      }, 300);
    }
  };

  // Keyboard navigation.
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      ) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go("next");
      }

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go("prev");
      }
    },
    [go]
  );

  const themeStyles: Record<ReaderTheme, React.CSSProperties> = {
    paper: {
      background: "#f6f0e5",
      color: "#30291f",
      borderColor: "#e2d5c1",
    },
    white: {
      background: "#ffffff",
      color: "#202020",
      borderColor: "#e5e5e5",
    },
    night: {
      background: "#202124",
      color: "#e8e3d9",
      borderColor: "#414247",
    },
  };

  const frontClass = [
    "flip-front",
    activeDir === "prev" ? "flip-origin-right" : "",
    snapping ? "flip-snap" : "",
    direction === "next" ? "flip-turning-next" : "",
    direction === "prev" ? "flip-turning-prev" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Gracefully handle a book without any chapters.
  if (!current) {
    return (
      <div style={{ maxWidth: "760px", margin: "2rem auto" }}>
        <p>This book does not have any chapters available yet.</p>
        <Link href={`/books/${bookId}`} className="post-view-back">
          ← Back to book
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Reader toolbar */}
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto 1rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: ".8rem",
        }}
      >
        <Link href={`/books/${bookId}`} className="post-view-back">
          ← {bookTitle}
        </Link>

        <div
          aria-label="Reader settings"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: ".5rem",
            fontSize: ".85rem",
          }}
        >
          <button
            type="button"
            onClick={() => setFontSize((size) => Math.max(14, size - 1))}
            disabled={fontSize <= 14}
            aria-label="Decrease font size"
            style={{ padding: ".35rem .65rem" }}
          >
            A−
          </button>

          <span aria-live="polite">{fontSize}px</span>

          <button
            type="button"
            onClick={() => setFontSize((size) => Math.min(24, size + 1))}
            disabled={fontSize >= 24}
            aria-label="Increase font size"
            style={{ padding: ".35rem .65rem" }}
          >
            A+
          </button>

          <label htmlFor="reader-theme" style={{ marginLeft: ".35rem" }}>
            Theme
          </label>

          <select
            id="reader-theme"
            value={theme}
            onChange={(event) =>
              setTheme(event.target.value as ReaderTheme)
            }
            style={{ padding: ".4rem", borderRadius: "4px" }}
          >
            <option value="paper">Paper</option>
            <option value="white">White</option>
            <option value="night">Night</option>
          </select>
        </div>
      </div>

      {/* Animated page-turn area */}
      <div
        className="flip-stage"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label="Book reader. Swipe horizontally or use the left and right arrow keys to turn pages."
        style={{
          ...themeStyles[theme],
          maxWidth: "760px",
          marginInline: "auto",
          outlineOffset: "4px",
        }}
      >
        {targetChapter && targetPosition && (
          <div className="flip-back" style={themeStyles[theme]}>
            <ChapterPage
              chapter={targetChapter}
              pageIndex={targetPosition.pageIndex}
              pageNumber={
                pagesByChapter
                  .slice(0, targetPosition.index)
                  .reduce((sum, pages) => sum + pages.length, 0) +
                targetPosition.pageIndex +
                1
              }
              bookId={bookId}
              priceInr={priceInr}
              isLoggedIn={isLoggedIn}
              fontSize={fontSize}
              size={size}
            />
          </div>
        )}

        <div
          className={frontClass}
          style={{
            ...themeStyles[theme],
            ...(resetting ? { transition: "none" } : {}),
            ...(dragDir && !direction
              ? {
                  transform: `rotateY(${(dragDir === "next" ? -1 : 1) * dragP * 178}deg)`,
                  ...(snapping ? {} : { transition: "none" }),
                  boxShadow: `${dragDir === "next" ? "-" : ""}${Math.round(dragP * 14)}px 0 ${Math.round(10 + dragP * 20)}px rgba(0,0,0,${(0.06 + dragP * 0.14).toFixed(3)})`,
                }
              : {}),
          }}
        >
          <ChapterPage
            chapter={current}
            pageIndex={pageIndex}
            pageNumber={pageNumber}
            bookId={bookId}
            priceInr={priceInr}
            isLoggedIn={isLoggedIn}
            fontSize={fontSize}
            size={size}
            viewRef={frontViewRef}
          />
        </div>

        {chapters.map((chapter) =>
          chapter.locked ? null : (
            <ChapterMeasurer
              key={chapter.id}
              chapter={chapter}
              fontSize={fontSize}
              size={size}
              onCount={handleCount}
            />
          )
        )}

        <div
          className={`flip-shade${direction ? " flip-shade-on" : ""}`}
          style={
            dragDir && !direction
              ? { opacity: Math.min(1, dragP * 1.2), background: "linear-gradient(90deg, rgba(0,0,0,.16), rgba(0,0,0,.04) 30%, transparent 55%)" }
              : undefined
          }
        />
      </div>

      {/* Reading progress */}
      <div
        style={{
          maxWidth: "760px",
          margin: "1rem auto .5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          fontSize: ".82rem",
          color: "var(--muted)",
        }}
      >
        <span>
          Page {pageNumber} of {totalPages}
        </span>

        <span>
          {Math.round((pageNumber / Math.max(totalPages, 1)) * 100)}% read
        </span>
      </div>

      <div
        style={{
          maxWidth: "760px",
          height: "4px",
          background: "var(--rule)",
          borderRadius: "10px",
          overflow: "hidden",
          margin: "0 auto 1.5rem",
        }}
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={totalPages}
        aria-valuenow={pageNumber}
      >
        <div
          style={{
            height: "100%",
            width: `${(pageNumber / Math.max(totalPages, 1)) * 100}%`,
            background: "var(--green)",
            transition: "width .25s ease",
          }}
        />
      </div>

      {/* Previous and next controls */}
      <div className="book-page-nav">
        <button
          className="book-page-nav-btn"
          onClick={() => go("prev")}
          disabled={!hasPrev}
          type="button"
        >
          <span className="book-page-nav-label">
            ← Previous page
          </span>

          <span className="book-page-nav-title">
            {pageIndex > 0
              ? `Page ${pageIndex}`
              : index > 0
                ? chapters[index - 1].title
                : "Beginning of book"}
          </span>
        </button>

        {hasNext ? (
          <button
            className="book-page-nav-btn book-page-nav-next"
            onClick={() => go("next")}
            disabled={!!current.locked}
            type="button"
          >
            <span className="book-page-nav-label">
              Next page →
            </span>

            <span className="book-page-nav-title">
              {pageIndex < currentPages.length - 1
                ? `Page ${pageIndex + 2}`
                : chapters[index + 1]?.title ?? "Next"}
            </span>
          </button>
        ) : (
          <Link
            href={`/books/${bookId}`}
            className="book-page-nav-btn book-page-nav-next"
          >
            <span className="book-page-nav-label">
              Finished
            </span>

            <span className="book-page-nav-title">
              Back to Contents
            </span>
          </Link>
        )}
      </div>

      <p
        className="reader-tip"
        style={{
          textAlign: "center",
          color: "var(--muted)",
          fontSize: ".78rem",
          marginTop: "1rem",
        }}
      >
        Tip: Swipe left or right on the page, or use ← and → on your keyboard.
      </p>
    </div>
  );
}