"use client";

import { useState } from "react";
import { createBook } from "@/app/actions/books";
import CoverImageUpload from "@/app/write/cover-image-upload";

export default function NewBookPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await createBook(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="write-page">
      <h2>Start a Book</h2>
      <p className="sub">Set it up now — you&apos;ll add chapters next. Nothing is public until you publish.</p>
      {error && <div className="form-error">{error}</div>}

      <form action={action}>
        <div className="form-group">
          <label>Title</label>
          <input name="title" type="text" placeholder="Your book's title…" maxLength={150} required />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            placeholder="What is this book about?"
            maxLength={600}
            style={{ minHeight: "120px" }}
          />
        </div>

        <div className="form-group">
          <label>Cover Image (optional)</label>
          <CoverImageUpload onUploaded={setCoverImageUrl} />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Book \u2192"}
        </button>
      </form>
    </div>
  );
}
