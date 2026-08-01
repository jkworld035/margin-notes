"use client";

import { useRef, useState } from "react";
import { submitPost } from "@/app/actions/posts";

export default function WritePage() {
  const [error, setError] = useState<string | null>(null);
  const [titleLen, setTitleLen] = useState(0);
  const [excerptLen, setExcerptLen] = useState(0);
  const [contentLen, setContentLen] = useState(0);
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after: string = before) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || "text";
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    setContentLen(next.length);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
    });
  }

  function prefixLine(prefix: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const next = content.slice(0, lineStart) + prefix + content.slice(lineStart);
    setContent(next);
    setContentLen(next.length);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + prefix.length;
    });
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await submitPost(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="write-page">
      <h2>Write a Story</h2>
      <p className="sub">Your story goes live immediately once you publish.</p>
      {error && <div className="form-error">{error}</div>}
      <form action={action}>
        <div className="form-group">
          <label>Title</label>
          <input
            name="title"
            type="text"
            placeholder="Your story title…"
            maxLength={120}
            onChange={(e) => setTitleLen(e.target.value.length)}
            required
          />
          <div className="char-count">
            <span>{titleLen}</span>/120
          </div>
        </div>
        <div className="form-group">
          <label>
            Subtitle <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
          </label>
          <input name="subtitle" type="text" placeholder="A supporting line under the title…" maxLength={150} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Primary category</label>
            <select name="category" defaultValue="Essays">
              <option value="Essays">Essays</option>
              <option value="Design">Design</option>
              <option value="Technology">Technology</option>
              <option value="Culture">Culture</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tags</label>
            <input name="tags" type="text" placeholder="comma, separated, tags" />
          </div>
        </div>
        <div className="form-group">
          <label>Short Excerpt</label>
          <input
            name="excerpt"
            type="text"
            placeholder="A one-line summary of your story…"
            maxLength={200}
            onChange={(e) => setExcerptLen(e.target.value.length)}
            required
          />
          <div className="char-count">
            <span>{excerptLen}</span>/200
          </div>
        </div>
        <div className="form-group">
          <label>Cover Image URL (optional)</label>
          <input name="coverImageUrl" type="url" placeholder="https://images.example.com/photo.jpg" />
        </div>
        <div className="form-group">
          <label>Content</label>
          <div style={{ display: "flex", gap: ".4rem", marginBottom: ".5rem" }}>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => wrapSelection("**")} title="Bold">
              <strong>B</strong>
            </button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => wrapSelection("*")} title="Italic">
              <em>I</em>
            </button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => prefixLine("## ")} title="Heading">
              H2
            </button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => prefixLine("> ")} title="Quote">
              &ldquo;&rdquo;
            </button>
          </div>
          <textarea
            ref={textareaRef}
            name="content"
            value={content}
            placeholder="Write your story here. Blank lines separate paragraphs."
            maxLength={12000}
            onChange={(e) => {
              setContent(e.target.value);
              setContentLen(e.target.value.length);
            }}
            required
          />
          <div className="form-hint">
            Supports <code>## Heading</code>, <code>&gt; Quote</code>, <code>**bold**</code>,{" "}
            <code>*italic*</code>. Leave a blank line between paragraphs.
          </div>
          <div className="char-count">
            <span>{contentLen}</span>/12000
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Publishing…" : "Publish Story \u2192"}
        </button>
      </form>
    </div>
  );
}
