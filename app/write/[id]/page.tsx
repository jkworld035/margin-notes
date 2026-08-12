"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { updatePost } from "@/app/actions/posts";
import CoverImageUpload from "../cover-image-upload";
import EditorToolbar from "../editor-toolbar";
import CoAuthorPanel from "./co-author-panel";
import { createClient } from "@/lib/supabase/client";
import { wordCount, estimateReadTimeClient } from "@/lib/text-stats";

export default function EditPostPage() {
  const params = useParams();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>("approved");
  const [showSchedule, setShowSchedule] = useState(false);
  const [isPrimaryAuthor, setIsPrimaryAuthor] = useState(false);
  const [coAuthorIds, setCoAuthorIds] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("Essays");
  const [tags, setTags] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const autosaveKey = `margin-notes-autosave-${postId}`;

  async function loadPost() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const { data: post } = await supabase
      .from("posts")
      .select("title, subtitle, category, tags, excerpt, content, cover_image_url, author_id, co_author_ids, status")
      .eq("id", postId)
      .single();

    if (!post || (post.author_id !== user.id && !(post.co_author_ids || []).includes(user.id))) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setTitle(post.title);
    setSubtitle(post.subtitle || "");
    setCategory(post.category);
    setTags((post.tags || []).join(", "));
    setExcerpt(post.excerpt);
    setContent(post.content);
    setCoverImageUrl(post.cover_image_url || "");
    setCurrentStatus(post.status);
    setIsPrimaryAuthor(post.author_id === user.id);
    setCoAuthorIds(post.co_author_ids || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Autosave every few seconds while editing
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      const fields = { title, subtitle, category, tags, excerpt, content };
      try {
        localStorage.setItem(autosaveKey, JSON.stringify(fields));
        setLastSaved(new Date());
      } catch {
        // storage unavailable — autosave silently skipped
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [title, subtitle, category, tags, excerpt, content, loading, autosaveKey]);

  async function submitWithMode(mode: "" | "publish" | "draft" | "schedule") {
    if (!formRef.current) return;
    if (mode === "schedule" && !showSchedule) {
      setShowSchedule(true);
      return;
    }
    setPending(mode || "save");
    setError(null);
    const formData = new FormData(formRef.current);
    formData.set("mode", mode);
    const res = await updatePost(postId, formData);
    if (res?.error) {
      setError(res.error);
      setPending(null);
    } else {
      try {
        localStorage.removeItem(autosaveKey);
      } catch {
        // ignore
      }
    }
  }

  if (loading) return <div className="write-page">Loading…</div>;
  if (notFound) return <div className="write-page">You don&apos;t have permission to edit this story.</div>;

  return (
    <div className="write-page">
      <h2>Edit Story</h2>
      <p className="sub">
        {currentStatus === "draft" ? "This is a draft — only you can see it." : "Changes go live immediately once saved."}
      </p>
      {error && <div className="form-error">{error}</div>}
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          submitWithMode("");
        }}
      >
        <div className="form-group">
          <label>Title</label>
          <input
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
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
            <input name="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Short Excerpt</label>
          <input
            name="excerpt"
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={200}
            required
          />
        </div>
        <div className="form-group">
          <label>Cover Image (optional)</label>
          <CoverImageUpload onUploaded={setCoverImageUrl} initialUrl={coverImageUrl} />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl} />
        </div>
        <div className="form-group">
          <label>Content</label>
          <EditorToolbar content={content} setContent={setContent} textareaRef={textareaRef} />
          <textarea
            ref={textareaRef}
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={20000}
            required
          />
          <div className="char-count" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              {content.length}/20000 &middot; {wordCount(content)} words &middot; {estimateReadTimeClient(content)} read
            </span>
            <span style={{ color: "var(--muted)" }}>
              {lastSaved ? `Autosaved ${lastSaved.toLocaleTimeString()}` : ""}
            </span>
          </div>
        </div>

        {isPrimaryAuthor && (
          <CoAuthorPanel postId={postId} coAuthorIds={coAuthorIds} onChange={loadPost} />
        )}

        {showSchedule && (
          <div className="form-group">
            <label>Schedule for</label>
            <input name="scheduledAt" type="datetime-local" />
          </div>
        )}

        <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={pending !== null}
            onClick={(e) => {
              e.preventDefault();
              submitWithMode("");
            }}
          >
            {pending === "save" ? "Saving…" : "Save Changes"}
          </button>
          {currentStatus === "draft" && (
            <button
              className="btn btn-neutral"
              type="button"
              disabled={pending !== null}
              onClick={() => submitWithMode("publish")}
            >
              {pending === "publish" ? "Publishing…" : "Publish Now"}
            </button>
          )}
          {currentStatus !== "draft" && (
            <button
              className="btn btn-neutral"
              type="button"
              disabled={pending !== null}
              onClick={() => submitWithMode("draft")}
            >
              {pending === "draft" ? "Saving…" : "Move to Draft"}
            </button>
          )}
          <button
            className="btn btn-ghost"
            type="button"
            disabled={pending !== null}
            onClick={() => submitWithMode("schedule")}
          >
            {pending === "schedule" ? "Scheduling…" : showSchedule ? "Confirm Schedule" : "Reschedule"}
          </button>
        </div>
      </form>
    </div>
  );
}
