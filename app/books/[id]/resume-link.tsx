"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Start / Continue reading" button. If the account has no saved position yet,
// fall back to the position saved on this device.
export default function ResumeLink({
  bookId,
  href,
  hasServerProgress,
  label,
}: {
  bookId: string;
  href: string;
  hasServerProgress: boolean;
  label: string;
}) {
  const [target, setTarget] = useState(href);
  const [text, setText] = useState(label);

  useEffect(() => {
    if (hasServerProgress) return;
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(`margin-notes-reader-${bookId}`) || "null"
      ) as { chapterNumber?: number; fraction?: number } | null;

      if (saved && Number.isInteger(saved.chapterNumber) && (saved.chapterNumber as number) >= 1) {
        setTarget(`/books/${bookId}?ch=${saved.chapterNumber}`);
        setText("Continue Reading");
      }
    } catch {
      // keep the default link
    }
  }, [bookId, hasServerProgress]);

  return (
    <Link href={target} className="btn btn-primary">
      {text}
    </Link>
  );
}
