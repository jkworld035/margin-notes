"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EditorToolbar({
  content,
  setContent,
  textareaRef,
}: {
  content: string;
  setContent: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function insertAtCursor(text: string) {
    const el = textareaRef.current;
    if (!el) {
      setContent(content + "\n\n" + text + "\n\n");
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = content.slice(0, start) + text + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
    });
  }

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

  function insertList(ordered: boolean) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);

    const items = selected.trim() ? selected.split("\n") : ["List item"];
    const listText = items
      .map((item, idx) => (ordered ? `${idx + 1}. ${item.trim() || "List item"}` : `- ${item.trim() || "List item"}`))
      .join("\n");

    const next = content.slice(0, start) + listText + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start;
      el.selectionEnd = start + listText.length;
    });
  }

  function handleLink() {
    const el = textareaRef.current;
    const selected = el ? content.slice(el.selectionStart, el.selectionEnd) : "";
    const url = window.prompt("Link URL:");
    if (!url) return;
    if (el && selected) {
      wrapSelection("[", `](${url})`);
    } else {
      insertAtCursor(`[link](${url})`);
    }
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video") {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    const maxSize = kind === "video" ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`${kind === "video" ? "Video" : "Image"} must be under ${kind === "video" ? "20MB" : "5MB"}.`);
      return;
    }

    setUploading(kind);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setUploading(null);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/content-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(null);
      return;
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    insertAtCursor(`\n\n![${file.name}](${data.publicUrl})\n\n`);
    setUploading(null);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: ".4rem", marginBottom: ".5rem", flexWrap: "wrap" }}>
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
        <button type="button" className="btn btn-neutral btn-sm" onClick={() => insertList(false)} title="Bulleted list">
          • List
        </button>
        <button type="button" className="btn btn-neutral btn-sm" onClick={() => insertList(true)} title="Numbered list">
          1. List
        </button>
        <button type="button" className="btn btn-neutral btn-sm" onClick={handleLink} title="Insert link">
          🔗 Link
        </button>
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading !== null}
          title="Insert image"
        >
          🖼 {uploading === "image" ? "Uploading…" : "Image"}
        </button>
        <button
          type="button"
          className="btn btn-neutral btn-sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading !== null}
          title="Insert video"
        >
          🎬 {uploading === "video" ? "Uploading…" : "Video"}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleMediaUpload(e, "image")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => handleMediaUpload(e, "video")}
        />
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
