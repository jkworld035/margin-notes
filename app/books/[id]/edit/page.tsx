"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  updateBook,
  setBookStatus,
  deleteBook,
  addChapter,
  updateChapter,
  deleteChapter,
} from "@/app/actions/books";
import EditorToolbar from "@/app/write/editor-toolbar";
import CoverImageUpload from "@/app/write/cover-image-upload";
import { wordCount, estimateReadTimeClient } from "@/lib/text-stats";
import { renderContent } from "@/lib/render-content";

type Chapter = { id: string; title: string; content: string; chapter_number: number };

export default function EditBookPage() {
  const params = useParams();
  const bookId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chTitle, setChTitle] = useState("");
  const [chContent, setChContent] = useState("");
  const [view, setView] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data: book } = await supabase
      .from("books")
      .select("title, description, cover_image_url, status, author_id")
      .eq("id", bookId)
      .single();

    if (!book || book.author_id !== user.id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTitle(book.title);
    setDescription(book.description || "");
    setCoverImageUrl(book.cover_image_url || "");
    setStatus(book.status);

    const { data: chs } = await supabase
      .from("book_chapters")
      .select("id, title, content, chapter_number")
      .eq("book_id", bookId)
      .order("chapter_number", { ascending: true });

    const list = chs || [];
    setChapters(list);
    if (list.length > 0 && !activeId) {
      setActiveId(list[0].id);
      setChTitle(list[0].title);
      setChContent(list[0].content);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  function selectChapter(c: Chapter) {
    setActiveId(c.id);
    setChTitle(c.title);
    setChContent(c.content);
    setView("write");
  }

  async function saveBookDetails() {
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("description", description);
    fd.set("coverImageUrl", coverImageUrl);
    const res = await updateBook(bookId, fd);
    setSaving(false);
    if (res?.error) setError(res.error);
  }

  async function saveChapter() {
    if (!activeId) return;
    setSaving(true);
    setError(null);
    const res = await updateChapter(activeId, bookId, chTitle, chContent);
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setChapters((cs) => cs.map((c) => (c.id === activeId ? { ...c, title: chTitle, content: chContent } : c)));
  }

  async function handleAddChapter() {
    const t = window.prompt("Chapter title:");
    if (!t) return;
    const res = await addChapter(bookId, t);
    if (res?.error) {
      setError(res.error);
      return;
    }
    await load();
    if (res?.chapterId) {
      setActiveId(res.chapterId);
      setChTitle(t);
      setChContent("");
    }
  }

  async function handleDeleteChapter(c: Chapter) {
    if (!confirm(`Delete chapter "${c.title}"? This can't be undone.`)) return;
    await deleteChapter(c.id, bookId);
    if (activeId === c.id) {
      setActiveId(null);
      setChTitle("");
      setChContent("");
    }
    await load();
  }

  async function togglePublish() {
    const next = status === "published" ? "draft" : "published";
    if (next === "published" && chapters.length === 0) {
      setError("Add at least one chapter before publishing.");
      return;
    }
    const res = await setBookStatus(bookId, next);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setStatus(next);
  }

  if (loading) return <div className="write-page">Loading…</div>;
  if (notFound) return <div className="write-page">You don&apos;t have permission to edit this book.</div>;

  return (
    <div className="write-page" style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>Edit Book</h2>
          <p className="sub">
            {status === "published" ? "This book is live." : "This book is a draft — only you can see it."}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link href={`/books/${bookId}`} className="btn btn-ghost btn-sm">
            Preview
          </Link>
          <button className="btn btn-neutral btn-sm" type="button" onClick={togglePublish}>
            {status === "published" ? "Unpublish" : "Publish Book"}
          </button>
          <button
            className="btn btn-danger btn-sm"
            type="button"
            onClick={() => {
              if (confirm("Delete this entire book and all its chapters? This can't be undone.")) {
                deleteBook(bookId);
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        <aside>
          <div className="section-bar" style={{ marginBottom: ".8rem", paddingTop: 0, borderTop: "none" }}>
            <h2 style={{ fontSize: "1rem" }}>Chapters</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: ".8rem" }}>
            {chapters.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
                <button
                  type="button"
                  onClick={() => selectChapter(c)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    padding: ".5rem .7rem",
                    background: activeId === c.id ? "var(--rule)" : "none",
                    border: "1px solid var(--rule)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: ".85rem",
                    color: "var(--ink)",
                  }}
                >
                  {c.chapter_number}. {c.title}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteChapter(c)}
                  title="Delete chapter"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" type="button" onClick={handleAddChapter} style={{ width: "100%" }}>
            + Add Chapter
          </button>
        </aside>

        <div>
          <details style={{ marginBottom: "1.5rem", border: "1px solid var(--rule)", padding: "1rem" }}>
            <summary style={{ cursor: "pointer", fontSize: ".85rem", fontWeight: 500 }}>Book details</summary>
            <div style={{ marginTop: "1rem" }}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={600}
                  style={{ minHeight: "100px" }}
                />
              </div>
              <div className="form-group">
                <label>Cover Image</label>
                <CoverImageUpload onUploaded={setCoverImageUrl} initialUrl={coverImageUrl} />
              </div>
              <button className="btn btn-primary btn-sm" type="button" onClick={saveBookDetails} disabled={saving}>
                {saving ? "Saving…" : "Save Details"}
              </button>
            </div>
          </details>

          {activeId ? (
            <>
              <div className="form-group">
                <label>Chapter title</label>
                <input type="text" value={chTitle} onChange={(e) => setChTitle(e.target.value)} maxLength={150} />
              </div>

              <div className="form-group">
                <label>Chapter content</label>

                <div className="editor-tabs">
                  <button
                    type="button"
                    className={`editor-tab${view === "write" ? " active" : ""}`}
                    onClick={() => setView("write")}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className={`editor-tab${view === "preview" ? " active" : ""}`}
                    onClick={() => setView("preview")}
                  >
                    Preview
                  </button>
                </div>

                {view === "write" ? (
                  <>
                    <EditorToolbar content={chContent} setContent={setChContent} textareaRef={textareaRef} />
                    <div className="editor-body-wrap">
                      <textarea
                        ref={textareaRef}
                        value={chContent}
                        onChange={(e) => setChContent(e.target.value)}
                        placeholder="Write this chapter…"
                        maxLength={50000}
                      />
                    </div>
                  </>
                ) : (
                  <div className="editor-body-wrap">
                    <div className="editor-preview">
                      {chContent.trim() ? (
                        renderContent(chContent)
                      ) : (
                        <p className="editor-preview-empty">Nothing to preview yet.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="char-count">
                  {wordCount(chContent)} words &middot; {estimateReadTimeClient(chContent)} read
                </div>
              </div>

              <button className="btn btn-primary" type="button" onClick={saveChapter} disabled={saving}>
                {saving ? "Saving…" : "Save Chapter"}
              </button>
            </>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
              {chapters.length === 0
                ? "Add your first chapter to start writing."
                : "Select a chapter from the left to edit it."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
