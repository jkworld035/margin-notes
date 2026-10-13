"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
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

type Chapter = {
  id: string;
  title: string;
  content: string;
  chapter_number: number;
};
type SaveStatus = "saved" | "unsaved" | "saving" | "error";
type Draft = { id: string; title: string; content: string };

const AUTOSAVE_DELAY = 1500;

export default function EditBookPage() {
  const params = useParams();
  const bookId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [price, setPrice] = useState("0");
  const [detailsSaved, setDetailsSaved] = useState(true);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [chTitle, setChTitle] = useState("");
  const [chContent, setChContent] = useState("");
  const [view, setView] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Refs let navigation and autosave use the latest draft, not a stale render.
  const draftRef = useRef<Draft | null>(null);
  const savedRef = useRef<Draft | null>(null);
  const pendingSaveRef = useRef<Promise<boolean> | null>(null);
  const saveStatusRef = useRef<SaveStatus>("saved");
  const detailsSavedRef = useRef(true);

  const changeSaveStatus = useCallback((next: SaveStatus) => {
    saveStatusRef.current = next;
    setSaveStatus(next);
  }, []);

  const setDetailsDirty = useCallback(() => {
    detailsSavedRef.current = false;
    setDetailsSaved(false);
  }, []);

  const openChapter = useCallback((chapter: Chapter | null) => {
    if (!chapter) {
      draftRef.current = null;
      savedRef.current = null;
      setActiveId(null);
      setChTitle("");
      setChContent("");
    } else {
      const snapshot = { id: chapter.id, title: chapter.title, content: chapter.content };
      draftRef.current = snapshot;
      savedRef.current = snapshot;
      setActiveId(chapter.id);
      setChTitle(chapter.title);
      setChContent(chapter.content);
    }
    changeSaveStatus("saved");
    setView("write");
  }, [changeSaveStatus]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!auth.user) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const { data: book, error: bookError } = await supabase
          .from("books")
          .select("title, description, cover_image_url, status, author_id, price_inr")
          .eq("id", bookId)
          .maybeSingle();
        if (bookError) throw bookError;
        if (!book || book.author_id !== auth.user.id) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const { data: chapterRows, error: chapterError } = await supabase
          .from("book_chapters")
          .select("id, title, content, chapter_number")
          .eq("book_id", bookId)
          .order("chapter_number", { ascending: true });
        if (chapterError) throw chapterError;
        if (cancelled) return;
        setTitle(book.title);
        setDescription(book.description ?? "");
        setCoverImageUrl(book.cover_image_url ?? "");
        setStatus(book.status);
        setPrice(String(book.price_inr ?? 0));
        const list: Chapter[] = chapterRows ?? [];
        setChapters(list);
        openChapter(list[0] ?? null);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load the book. Please retry.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [bookId, openChapter]);

  // Keep the live draft in a ref as well as React state.
  const changeChapterTitle = (value: string) => {
    setChTitle(value);
    if (draftRef.current) draftRef.current = { ...draftRef.current, title: value };
    changeSaveStatus("unsaved");
  };
  const changeChapterContent: Dispatch<SetStateAction<string>> = (value) => {
    const previous = draftRef.current?.content ?? "";
    const next = typeof value === "function" ? value(previous) : value;
    setChContent(next);
    if (draftRef.current) draftRef.current = { ...draftRef.current, content: next };
    changeSaveStatus("unsaved");
  };

  // Only one save at a time. If a newer draft exists, the next save will
  // pick it up instead of overwriting it with an older snapshot.
  const saveChapter = useCallback(async (): Promise<boolean> => {
    if (pendingSaveRef.current) {
      await pendingSaveRef.current;
    }
    const draft = draftRef.current;
    if (!draft) return true;
    if (savedRef.current?.id === draft.id &&
        savedRef.current.title === draft.title &&
        savedRef.current.content === draft.content) {
      changeSaveStatus("saved");
      return true;
    }
    const snapshot = { ...draft };
    changeSaveStatus("saving");
    setError(null);
    const request = (async () => {
      try {
        const result = await updateChapter(snapshot.id, bookId, snapshot.title, snapshot.content);
        if (result?.error) throw new Error(result.error);
        savedRef.current = snapshot;
        setChapters((current) => current.map((chapter) =>
          chapter.id === snapshot.id
            ? { ...chapter, title: snapshot.title, content: snapshot.content }
            : chapter
        ));
        const latest = draftRef.current;
        changeSaveStatus(latest?.id === snapshot.id &&
          latest.title === snapshot.title && latest.content === snapshot.content
          ? "saved" : "unsaved");
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Chapter could not be saved.");
        changeSaveStatus("error");
        return false;
      }
    })();
    pendingSaveRef.current = request;
    try {
      return await request;
    } finally {
      if (pendingSaveRef.current === request) pendingSaveRef.current = null;
    }
  }, [bookId, changeSaveStatus]);

  // Debounce chapter autosave. A failed save remains unsaved for manual retry.
  useEffect(() => {
    if (!activeId || saveStatus !== "unsaved") return;
    const timer = window.setTimeout(() => { void saveChapter(); }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [activeId, chTitle, chContent, saveStatus, saveChapter]);

  // Warn on closing/reloading the tab when changes have not been saved.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveStatusRef.current !== "saved" || !detailsSavedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function flushDraft() {
    if (saveStatusRef.current === "saved") return true;
    return saveChapter();
  }

  async function selectChapter(chapter: Chapter) {
    if (chapter.id === draftRef.current?.id) return;
    if (!(await flushDraft())) return;
    openChapter(chapter);
    setError(null);
  }

  async function saveBookDetails() {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("description", description);
      form.set("coverImageUrl", coverImageUrl);
      form.set("price", price);
      const result = await updateBook(bookId, form);
      if (result?.error) throw new Error(result.error);
      detailsSavedRef.current = true;
      setDetailsSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save book details.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddChapter() {
    if (!(await flushDraft())) return;
    const proposed = window.prompt("Chapter title:");
    const name = proposed?.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const result = await addChapter(bookId, name);
      if (result?.error) throw new Error(result.error);
      if (!result?.chapterId) throw new Error("Chapter was not created.");
      const next: Chapter = {
        id: result.chapterId,
        title: name,
        content: "",
        chapter_number: Math.max(0, ...chapters.map((c) => c.chapter_number)) + 1,
      };
      setChapters((current) => [...current, next]);
      openChapter(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add chapter.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteChapter(chapter: Chapter) {
    if (!window.confirm(`Delete chapter "${chapter.title}"? This cannot be undone.`)) return;
    if (draftRef.current?.id !== chapter.id && !(await flushDraft())) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteChapter(chapter.id, bookId);
      if (result?.error) throw new Error(result.error);
      const remaining = chapters.filter((c) => c.id !== chapter.id);
      setChapters(remaining);
      if (draftRef.current?.id === chapter.id) openChapter(remaining[0] ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete chapter.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish() {
    if (!(await flushDraft())) return;
    if (!detailsSavedRef.current) {
      setError("Save your book details before changing its publication status.");
      return;
    }
    const next = status === "published" ? "draft" : "published";
    if (next === "published" && chapters.length === 0) {
      setError("Add at least one chapter before publishing.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await setBookStatus(bookId, next);
      if (result?.error) throw new Error(result.error);
      setStatus(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change publication status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteBook() {
    if (!window.confirm("Delete this entire book? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteBook(bookId);
      if (result?.error) throw new Error(result.error);
      // On success, the server action redirects to /books.
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the book.");
      setBusy(false);
    }
  }

  if (loading) return <div className="write-page">Loading...</div>;
  if (notFound) return <div className="write-page">You do not have permission to edit this book.</div>;
  if (error && !title && chapters.length === 0) {
    return <div className="write-page"><div className="form-error">{error}</div><button onClick={() => window.location.reload()} className="btn btn-primary">Retry</button></div>;
  }

  const statusText: Record<SaveStatus, string> = {
    saved: "All chapter changes saved",
    unsaved: "Unsaved changes",
    saving: "Saving chapter...",
    error: "Save failed — retry below",
  };

  return (
    <div className="write-page" style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2>Edit Book</h2>
          <p className="sub">{status === "published" ? "This book is live." : "This book is a draft — only you can see it."}</p>
          <p aria-live="polite" style={{ fontSize: ".85rem", color: "var(--muted)", marginTop: ".35rem" }}>
            {activeId ? statusText[saveStatus] : "No chapter selected"}
            {!detailsSaved ? " · Book details not saved" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link href={`/books/${bookId}`} className="btn btn-ghost btn-sm" onClick={(event) => {
            if (saveStatusRef.current !== "saved" || !detailsSavedRef.current) {
              event.preventDefault();
              setError("Save all changes before leaving the editor.");
            }
          }}>Preview</Link>
          <button className="btn btn-neutral btn-sm" type="button" disabled={busy || saveStatus === "saving"} onClick={() => void togglePublish()}>
            {status === "published" ? "Unpublish" : "Publish Book"}
          </button>
          <button className="btn btn-danger btn-sm" type="button" disabled={busy || saveStatus === "saving"} onClick={() => void handleDeleteBook()}>Delete</button>
        </div>
      </div>

      {error && <div role="alert" className="form-error" style={{ marginTop: "1rem" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(170px, 240px) minmax(0, 1fr)", gap: "1.5rem", marginTop: "1.5rem" }}>
        <aside>
          <div className="section-bar" style={{ marginBottom: ".8rem", paddingTop: 0, borderTop: "none" }}><h2 style={{ fontSize: "1rem" }}>Chapters</h2></div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".3rem", marginBottom: ".8rem" }}>
            {chapters.map((chapter) => (
              <div key={chapter.id} style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
                <button type="button" disabled={busy} onClick={() => void selectChapter(chapter)} style={{
                  flex: 1, minWidth: 0, textAlign: "left", padding: ".5rem .7rem",
                  background: activeId === chapter.id ? "var(--rule)" : "none",
                  border: "1px solid var(--rule)", borderRadius: "4px", cursor: "pointer",
                  fontSize: ".85rem", color: "var(--ink)", overflowWrap: "anywhere",
                }}>{chapter.chapter_number}. {chapter.title}</button>
                <button type="button" disabled={busy} onClick={() => void handleDeleteChapter(chapter)} title="Delete chapter" aria-label={`Delete ${chapter.title}`} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>×</button>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => void handleAddChapter()} style={{ width: "100%" }}>+ Add Chapter</button>
        </aside>

        <div style={{ minWidth: 0 }}>
          <details style={{ marginBottom: "1.5rem", border: "1px solid var(--rule)", padding: "1rem" }}>
            <summary style={{ cursor: "pointer", fontSize: ".85rem", fontWeight: 500 }}>Book details {!detailsSaved ? "(unsaved)" : ""}</summary>
            <div style={{ marginTop: "1rem" }}>
              <div className="form-group"><label htmlFor="book-title">Title</label><input id="book-title" type="text" value={title} onChange={(e) => { setTitle(e.target.value); setDetailsDirty(); }} maxLength={150} /></div>
              <div className="form-group"><label htmlFor="book-description">Description</label><textarea id="book-description" value={description} onChange={(e) => { setDescription(e.target.value); setDetailsDirty(); }} maxLength={600} style={{ minHeight: "100px" }} /></div>
              <div className="form-group">
                <label htmlFor="book-price">Price (₹)</label>
                <input id="book-price" type="number" min={0} max={100000} step={1} value={price} onChange={(e) => { setPrice(e.target.value); setDetailsDirty(); }} />
                <div className="form-hint">0 = free. For paid books, the first chapter stays free as a preview. Past purchases keep the price they were bought at.</div>
              </div>
              <div className="form-group"><label>Cover Image</label><CoverImageUpload onUploaded={(url) => { setCoverImageUrl(url); setDetailsDirty(); }} initialUrl={coverImageUrl} /></div>
              <button className="btn btn-primary btn-sm" type="button" onClick={() => void saveBookDetails()} disabled={busy || detailsSaved}>{busy ? "Saving..." : detailsSaved ? "Details Saved" : "Save Details"}</button>
            </div>
          </details>

          {activeId ? (
            <>
              <div className="form-group"><label htmlFor="chapter-title">Chapter title</label><input id="chapter-title" type="text" value={chTitle} onChange={(e) => changeChapterTitle(e.target.value)} maxLength={150} /></div>
              <div className="form-group">
                <label>Chapter content</label>
                <div className="editor-tabs">
                  <button type="button" className={`editor-tab${view === "write" ? " active" : ""}`} onClick={() => setView("write")}>Write</button>
                  <button type="button" className={`editor-tab${view === "preview" ? " active" : ""}`} onClick={() => setView("preview")}>Preview</button>
                </div>
                {view === "write" ? (
                  <>
                    <EditorToolbar content={chContent} setContent={changeChapterContent} textareaRef={textareaRef} />
                    <div className="editor-body-wrap"><textarea ref={textareaRef} value={chContent} onChange={(e) => changeChapterContent(e.target.value)} placeholder="Write this chapter..." maxLength={50000} /></div>
                  </>
                ) : (
                  <div className="editor-body-wrap"><div className="editor-preview">{chContent.trim() ? renderContent(chContent) : <p className="editor-preview-empty">Nothing to preview yet.</p>}</div></div>
                )}
                <div className="char-count">{wordCount(chContent)} words &middot; {estimateReadTimeClient(chContent)} read</div>
              </div>
              <button className="btn btn-primary" type="button" onClick={() => void saveChapter()} disabled={busy || saveStatus === "saving" || saveStatus === "saved"}>
                {saveStatus === "saving" ? "Saving..." : saveStatus === "error" ? "Retry Save" : saveStatus === "saved" ? "Saved" : "Save Chapter"}
              </button>
              <p className="form-hint" aria-live="polite" style={{ marginTop: ".5rem" }}>Chapters autosave about 1.5 seconds after you stop typing. Book details are saved separately.</p>
            </>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>{chapters.length === 0 ? "Add your first chapter to start writing." : "Select a chapter from the left to edit it."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
