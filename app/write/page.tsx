"use client";

import { useEffect, useRef, useState } from "react";
import { submitPost } from "@/app/actions/posts";
import CoverImageUpload from "./cover-image-upload";
import EditorToolbar from "./editor-toolbar";
import { wordCount, estimateReadTimeClient } from "@/lib/text-stats";

const AUTOSAVE_KEY = "margin-notes-autosave-new-post";

type DraftFields = {
  title: string;
  subtitle: string;
  category: string;
  tags: string;
  excerpt: string;
  content: string;
};

export default function WritePage() {
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("Essays");
  const [tags, setTags] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [restoreBanner, setRestoreBanner] = useState<DraftFields | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Check for an unsaved autosave on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftFields;
        if (parsed.title || parsed.content) setRestoreBanner(parsed);
      }
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  // Autosave every few seconds while there's meaningful content
  useEffect(() => {
    const interval = setInterval(() => {
      if (!title && !content) return;
      const fields: DraftFields = { title, subtitle, category, tags, excerpt, content };
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(fields));
        setLastSaved(new Date());
      } catch {
        // storage unavailable — autosave silently skipped
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [title, subtitle, category, tags, excerpt, content]);

  function restoreDraft() {
    if (!restoreBanner) return;
    setTitle(restoreBanner.title);
    setSubtitle(restoreBanner.subtitle);
    setCategory(restoreBanner.category);
    setTags(restoreBanner.tags);
    setExcerpt(restoreBanner.excerpt);
    setContent(restoreBanner.content);
    setRestoreBanner(null);
  }

  function discardDraft() {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // ignore
    }
    setRestoreBanner(null);
  }

  function clearAutosave() {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch {
      // ignore
    }
  }

  async function submitWithMode(mode: "publish" | "draft" | "schedule") {
    if (!formRef.current) return;
    if (mode === "schedule" && !showSchedule) {
      setShowSchedule(true);
      return;
    }
    setPending(mode);
    setError(null);
    const formData = new FormData(formRef.current);
    formData.set("mode", mode);
    const res = await submitPost(formData);
    if (res?.error) {
      setError(res.error);
      setPending(null);
    } else {
      clearAutosave();
    }
  }

  return (
    <div className="write-page">
      <h2>Write a Story</h2>
      <p className="sub">Publish now, save as a draft, or schedule it for later.</p>
      {error && <div className="form-error">{error}</div>}

      {restoreBanner && (
        <div className="earnings-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <span>You have an unsaved draft from a previous session.</span>
          <div style={{ display: "flex", gap: ".5rem" }}>
            <button className="btn btn-primary btn-sm" type="button" onClick={restoreDraft}>
              Restore
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={discardDraft}>
              Discard
            </button>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          submitWithMode("publish");
        }}
      >
        <div className="form-group">
          <label>Title</label>
          <input
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your story title…"
            maxLength={120}
            required
          />
          <div className="char-count">
            <span>{title.length}</span>/120
          </div>
        </div>
        <div className="form-group">
          <label>
            Subtitle <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            name="subtitle"
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="A supporting line under the title…"
            maxLength={150}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Primary category</label>
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Essays">Essays</option>
              <option value="Design">Design</option>
              <option value="Technology">Technology</option>
              <option value="Culture">Culture</option>
              <option value="Business">Business</option>
              <option value="Health">Health</option>
              <option value="Travel">Travel</option>
              <option value="Lifestyle">Lifestyle</option>
              <option value="Science">Science</option>
              <option value="Education">Education</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tags</label>
            <input name="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated, tags" />
          </div>
        </div>
        <div className="form-group">
          <label>Short Excerpt</label>
          <input
            name="excerpt"
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A one-line summary of your story…"
            maxLength={200}
            required
          />
          <div className="char-count">
            <span>{excerpt.length}</span>/200
          </div>
        </div>
        <div className="form-group">
          <label>Cover Image (optional)</label>
          <CoverImageUpload onUploaded={setCoverImageUrl} />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        </div>
        <div className="form-group">
          <label>Content</label>
          <EditorToolbar content={content} setContent={setContent} textareaRef={textareaRef} />
          <textarea
            ref={textareaRef}
            name="content"
            value={content}
            placeholder="Write your story here. Blank lines separate paragraphs."
            maxLength={20000}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <div className="form-hint">
            Supports <code>## Heading</code>, <code>&gt; Quote</code>, <code>**bold**</code>,{" "}
            <code>*italic*</code>, lists, links, tables, code blocks, and inline images/videos via the toolbar
            buttons above.
          </div>
          <div className="char-count" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {content.length}/20000 &middot; {wordCount(content)} words &middot; {estimateReadTimeClient(content)} read
            </span>
            <span style={{ color: "var(--muted)" }}>
              {lastSaved ? `Autosaved ${lastSaved.toLocaleTimeString()}` : ""}
            </span>
          </div>
        </div>

        {showSchedule && (
          <div className="form-group">
            <label>Schedule for</label>
            <input name="scheduledAt" type="datetime-local" />
          </div>
        )}

        <input type="hidden" name="mode" value="publish" />

        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending !== null}
            onClick={(e) => {
              e.preventDefault();
              submitWithMode("publish");
            }}
          >
            {pending === "publish" ? "Publishing…" : "Publish Now \u2192"}
          </button>
          <button
            className="btn btn-neutral"
            type="button"
            disabled={pending !== null}
            onClick={() => submitWithMode("draft")}
          >
            {pending === "draft" ? "Saving…" : "Save Draft"}
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            disabled={pending !== null}
            onClick={() => submitWithMode("schedule")}
          >
            {pending === "schedule" ? "Scheduling…" : showSchedule ? "Confirm Schedule" : "Schedule for Later"}
          </button>
        </div>
      </form>
    </div>
  );
}
