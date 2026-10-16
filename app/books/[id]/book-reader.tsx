"use client";

import {
  useCallback,
  useEffect,
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

const PAGE_TARGET = 1150;
const FLIP_DURATION = 420;

function splitLongBlock(block: string): string[] {
  const trimmed = block.trim();

  if (!trimmed) return [];

  // Keep structured content together whenever possible.
  if (
    trimmed.startsWith("```") ||
    trimmed.startsWith("|") ||
    /^!\[[^\]]*\]\([^)]+\)$/.test(trimmed) ||
    /^https?:\/\/\S+$/.test(trimmed)
  ) {
    return [trimmed];
  }

  // Split exceptionally long paragraphs at sentence boundaries.
  const sentences = trimmed.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g);
  if (!sentences || sentences.length < 2) return [trimmed];

  const result: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence.trim()}` : sentence.trim();

    if (current && next.length > PAGE_TARGET) {
      result.push(current);
      current = sentence.trim();
    } else {
      current = next;
    }
  }

  if (current) result.push(current);

  return result;
}

function paginateContent(content: string): string[] {
  const blocks = content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap(splitLongBlock);

  if (blocks.length === 0) return [""];

  const pages: string[] = [];
  let current: string[] = [];
  let currentLength = 0;

  for (const block of blocks) {
    const extraLength = block.length + (current.length ? 2 : 0);

    if (current.length > 0 && currentLength + extraLength > PAGE_TARGET) {
      pages.push(current.join("\n\n"));
      current = [];
      currentLength = 0;
    }

    const separatorLength = current.length ? 2 : 0;
    current.push(block);
    currentLength += block.length + separatorLength;
  }

  if (current.length > 0) {
    pages.push(current.join("\n\n"));
  }

  return pages.length ? pages : [""];
}

function ChapterPage({
  chapter,
  content,
  pageNumber,
  chapterPageNumber,
  chapterPageCount,
  totalChapters,
  bookId,
  priceInr,
  isLoggedIn,
  fontSize,
}: {
  chapter: Chapter;
  content: string;
  pageNumber: number;
  chapterPageNumber: number;
  chapterPageCount: number;
  totalChapters: number;
  bookId: string;
  priceInr: number;
  isLoggedIn: boolean;
  fontSize: number;
}) {
  return (
    <article className="book-page">
      {chapterPageNumber === 1 ? (
        <header className="book-page-header">
          <span className="book-page-chapter-label">
            Chapter {chapter.chapter_number}
          </span>

          <h1>{chapter.title}</h1>

          <div className="book-page-rule" />
        </header>
      ) : (
        <div
          style={{
            fontSize: ".72rem",
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--muted)",
            borderBottom: "1px solid var(--rule)",
            paddingBottom: ".65rem",
            marginBottom: "1.4rem",
          }}
        >
          {chapter.title}
        </div>
      )}

      {chapter.locked ? (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".6rem" }}>
            🔒
          </div>

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
          className="book-page-body"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: 1.85,
            overflowWrap: "anywhere",
          }}
        >
          {renderContent(content)}
        </div>
      )}

      <footer
        className="book-page-number"
        aria-label={`Page ${pageNumber}, chapter ${chapterPageNumber} of ${chapterPageCount}`}
      >
        <span>
          {chapter.locked
            ? "Preview"
            : `Chapter ${chapter.chapter_number} · ${chapterPageNumber} / ${chapterPageCount}`}
        </span>

        <span style={{ marginLeft: ".75rem" }}>
          {pageNumber} · {totalChapters} chapters
        </span>
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
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const pagesByChapter = useMemo(
    () =>
      chapters.map((chapter) =>
        chapter.locked ? [""] : paginateContent(chapter.content)
      ),
    [chapters]
  );

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
          const maxPage = pagesByChapter[savedIndex].length - 1;

          setIndex(savedIndex);
          setPageIndex(
            Math.max(0, Math.min(position.pageIndex ?? 0, maxPage))
          );

          router.replace(
            `/books/${bookId}?ch=${savedChapter.chapter_number}`,
            { scroll: false }
          );
        }
      }
    } catch {
      // Ignore unavailable storage or invalid saved progress.
    }
  }, [bookId, chapters, pagesByChapter, router]);

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
  const currentPage = currentPages[pageIndex] ?? "";

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
    direction === "next"
      ? pageIndex < currentPages.length - 1
        ? { index, pageIndex: pageIndex + 1 }
        : index < chapters.length - 1
          ? { index: index + 1, pageIndex: 0 }
          : null
      : direction === "prev"
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

  const targetContent = targetPosition
    ? pagesByChapter[targetPosition.index]?.[targetPosition.pageIndex] ?? ""
    : "";

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

  // Record the start point for a touch or mouse swipe.
  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

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
    };

    // Keep receiving pointer events if the finger moves outside the reader.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may not be available in every environment.
    }
  };

  // Navigate only when the gesture is clearly horizontal.
  const handlePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const start = swipeStart.current;
    swipeStart.current = null;

    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    // Ignore short movements and mostly vertical scrolling.
    if (
      Math.abs(deltaX) < 55 ||
      Math.abs(deltaX) < Math.abs(deltaY) * 1.3
    ) {
      return;
    }

    if (deltaX < 0) {
      go("next");
    } else {
      go("prev");
    }
  };

  const handlePointerCancel = () => {
    swipeStart.current = null;
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
    direction === "prev" ? "flip-origin-right" : "",
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
              content={targetContent}
              pageNumber={
                pagesByChapter
                  .slice(0, targetPosition.index)
                  .reduce((sum, pages) => sum + pages.length, 0) +
                targetPosition.pageIndex +
                1
              }
              chapterPageNumber={targetPosition.pageIndex + 1}
              chapterPageCount={
                pagesByChapter[targetPosition.index].length
              }
              totalChapters={chapters.length}
              bookId={bookId}
              priceInr={priceInr}
              isLoggedIn={isLoggedIn}
              fontSize={fontSize}
            />
          </div>
        )}

        <div
          className={frontClass}
          style={{
            ...themeStyles[theme],
            ...(resetting ? { transition: "none" } : {}),
          }}
        >
          <ChapterPage
            chapter={current}
            content={currentPage}
            pageNumber={pageNumber}
            chapterPageNumber={pageIndex + 1}
            chapterPageCount={currentPages.length}
            totalChapters={chapters.length}
            bookId={bookId}
            priceInr={priceInr}
            isLoggedIn={isLoggedIn}
            fontSize={fontSize}
          />
        </div>

        <div
          className={`flip-shade${direction ? " flip-shade-on" : ""}`}
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