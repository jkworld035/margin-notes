"use client";

import { useRef, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { updatePost } from "@/app/actions/posts";
import CoverImageUpload from "../cover-image-upload";
import { createClient } from "@/lib/supabase/client";

export default function EditPostPage() {
  const params = useParams();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pending, setPending] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("Essays");
  const [tags, setTags] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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
      const { data: post } = await supabase
        .from("posts")
        .select("title, subtitle, category, tags, excerpt, content, cover_image_url, author_id")
        .eq("id", postId)
        .single();

      if (!post || post.author_id !== user.id) {
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
      setLoading(false);
    }
    load();
  }, [postId]);

  function wrapSelection(before: string, after: string = before) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || "text";
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
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
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + prefix.length;
    });
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await updatePost(postId, formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  if (loading) return <div className="write-page">Loading…</div>;
  if (notFound) return <div className="write-page">You don&apos;t have permission to edit this story.</div>;

  return (
    <div className="write-page">
      <h2>Edit Story</h2>
      <p className="sub">Changes go live immediately once saved.</p>
      {error && <div className="form-error">{error}</div>}
      <form action={action}>
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
          <div style={{ display: "flex", gap: ".4rem", marginBottom: ".5rem" }}>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => wrapSelection("**")}>
              <strong>B</strong>
            </button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => wrapSelection("*")}>
              <em>I</em>
            </button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => prefixLine("## ")}>
              H2
            </button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => prefixLine("> ")}>
              &ldquo;&rdquo;
            </button>
          </div>
          <textarea
            ref={textareaRef}
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={12000}
            required
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
