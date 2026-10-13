"use client";

import { useState } from "react";
import { createBook } from "@/app/actions/books";
import CoverImageUpload from "@/app/write/cover-image-upload";
import { BOOK_TEMPLATES } from "../book-templates";

export default function NewBookPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [templateId, setTemplateId] = useState("");

  const selected = BOOK_TEMPLATES.find((t) => t.id === templateId);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await createBook(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  const optionStyle = (active: boolean): React.CSSProperties => ({
    textAlign: "left",
    padding: ".85rem .9rem",
    background: active ? "var(--card)" : "none",
    border: `1px solid ${active ? "var(--accent)" : "var(--rule)"}`,
    boxShadow: active ? "0 0 0 3px rgba(212,82,42,.1)" : "none",
    borderRadius: 4,
    cursor: "pointer",
    color: "var(--ink)",
    fontFamily: "var(--sans)",
    transition: "border-color .15s",
  });

  return (
    <div className="write-page" style={{ maxWidth: 860 }}>
      <h2>Start a Book</h2>
      <p className="sub">Set it up now — you&apos;ll add chapters next. Nothing is public until you publish.</p>
      {error && <div className="form-error">{error}</div>}

      <form action={action}>
        <div className="form-group">
          <label>How would you like to start?</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: ".7rem" }}>
            <button type="button" onClick={() => setTemplateId("")} style={optionStyle(templateId === "")}>
              <div style={{ fontSize: "1.3rem" }}>📝</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: ".98rem", margin: ".2rem 0" }}>Start blank</div>
              <div style={{ fontSize: ".74rem", color: "var(--muted)" }}>An empty book. You add every chapter.</div>
            </button>
            {BOOK_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} style={optionStyle(templateId === t.id)}>
                <div style={{ fontSize: "1.3rem" }}>{t.icon}</div>
                <div style={{ fontFamily: "var(--serif)", fontSize: ".98rem", margin: ".2rem 0" }}>{t.label}</div>
                <div style={{ fontSize: ".74rem", color: "var(--muted)" }}>
                  {t.tagline} · {t.chapters.length} chapters
                </div>
              </button>
            ))}
          </div>
          <input type="hidden" name="templateId" value={templateId} />

          {selected && (
            <div style={{ marginTop: "1rem", padding: "1rem 1.2rem", background: "var(--card)", border: "1px solid var(--rule)" }}>
              <div style={{ fontSize: ".78rem", color: "var(--muted)", marginBottom: ".5rem" }}>
                {selected.label} template — these chapters will be created for you. You can rename, delete, add
                and reorder them any time.
              </div>
              <ol style={{ margin: 0, paddingLeft: "1.3rem", fontSize: ".86rem", lineHeight: 1.9 }}>
                {selected.chapters.map((c) => (
                  <li key={c.title}>{c.title}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

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
          <label>Price (₹)</label>
          <input name="price" type="number" min={0} max={100000} step={1} defaultValue={0} />
          <div className="form-hint">
            Enter 0 to make the book free. For a paid book, readers can read the first chapter free and unlock
            the rest by buying it.
          </div>
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