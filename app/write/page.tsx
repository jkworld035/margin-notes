"use client";

import { useRef, useState } from "react";
import { submitPost } from "@/app/actions/posts";
import CoverImageUpload from "./cover-image-upload";
import EditorToolbar from "./editor-toolbar";

export default function WritePage() {
  const [error, setError] = useState<string | null>(null);
  const [titleLen, setTitleLen] = useState(0);
  const [excerptLen, setExcerptLen] = useState(0);
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
            <code>*italic*</code>, lists, links, and inline images/videos via the toolbar buttons above.
          </div>
          <div className="char-count">
            <span>{content.length}</span>/20000
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Publishing…" : "Publish Story \u2192"}
        </button>
      </form>
    </div>
  );
}
