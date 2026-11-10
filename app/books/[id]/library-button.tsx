"use client";

import { useState, useTransition } from "react";
import { toggleLibraryBook } from "@/app/actions/library";

export default function LibraryButton({
  bookId,
  initialSaved,
}: {
  bookId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleLibraryBook(bookId);
          if (result && "saved" in result) setSaved(Boolean(result.saved));
          else if (result && "error" in result && result.error) alert(result.error);
        })
      }
    >
      {saved ? "✓ In your library" : "+ Save to library"}
    </button>
  );
}
