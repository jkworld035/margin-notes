"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS = {
  bold: (
    <Icon>
      <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />
    </Icon>
  ),
  italic: (
    <Icon>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </Icon>
  ),
  heading: (
    <Icon>
      <path d="M6 4v16M18 4v16M6 12h12" />
    </Icon>
  ),
  quote: (
    <Icon>
      <path d="M7 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3M17 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3" />
    </Icon>
  ),
  bulletList: (
    <Icon>
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
    </Icon>
  ),
  numberedList: (
    <Icon>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <path d="M4 6h1v-2h-1M4 10h1.5M4 14h1v4h-1.5M4.5 18h1" />
    </Icon>
  ),
  link: (
    <Icon>
      <path d="M9 15l6-6M8 12l-2 2a3 3 0 0 0 4 4l2-2M16 12l2-2a3 3 0 0 0-4-4l-2 2" />
    </Icon>
  ),
  image: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 15l-5-5L5 20" />
    </Icon>
  ),
  video: (
    <Icon>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M21 8l-4 3 4 3z" />
    </Icon>
  ),
  table: (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </Icon>
  ),
  code: (
    <Icon>
      <polyline points="8 6 3 12 8 18" />
      <polyline points="16 6 21 12 16 18" />
    </Icon>
  ),
  upload: (
    <Icon>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Icon>
  ),
  embed: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </Icon>
  ),
};

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="editor-toolbar-btn"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

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
  const mdInputRef = useRef<HTMLInputElement>(null);
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

  function insertTable() {
    const template =
      "\n\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n\n";
    insertAtCursor(template);
  }

  function insertCodeBlock() {
    const el = textareaRef.current;
    const selected = el ? content.slice(el.selectionStart, el.selectionEnd) : "";
    if (el && selected) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = content.slice(0, start) + `\n\n\`\`\`\n${selected}\n\`\`\`\n\n` + content.slice(end);
      setContent(next);
    } else {
      insertAtCursor(`\n\n\`\`\`\nyour code here\n\`\`\`\n\n`);
    }
  }

  function handleMarkdownImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setContent(content ? content + "\n\n" + text : text);
    };
    reader.readAsText(file);
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

  function handleEmbedVideo() {
    const url = window.prompt("Paste a YouTube or Vimeo link:");
    if (!url) return;
    insertAtCursor(`\n\n${url.trim()}\n\n`);
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
    <div className="editor-toolbar">
      <div className="editor-toolbar-group">
        <ToolbarButton icon={ICONS.bold} label="Bold" onClick={() => wrapSelection("**")} />
        <ToolbarButton icon={ICONS.italic} label="Italic" onClick={() => wrapSelection("*")} />
        <ToolbarButton icon={ICONS.heading} label="Heading" onClick={() => prefixLine("## ")} />
        <ToolbarButton icon={ICONS.quote} label="Quote" onClick={() => prefixLine("> ")} />
      </div>
      <div className="editor-toolbar-sep" />
      <div className="editor-toolbar-group">
        <ToolbarButton icon={ICONS.bulletList} label="Bulleted list" onClick={() => insertList(false)} />
        <ToolbarButton icon={ICONS.numberedList} label="Numbered list" onClick={() => insertList(true)} />
        <ToolbarButton icon={ICONS.link} label="Insert link" onClick={handleLink} />
      </div>
      <div className="editor-toolbar-sep" />
      <div className="editor-toolbar-group">
        <ToolbarButton
          icon={ICONS.image}
          label={uploading === "image" ? "Uploading image…" : "Insert image"}
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading !== null}
        />
        <ToolbarButton
          icon={ICONS.video}
          label={uploading === "video" ? "Uploading video…" : "Insert video"}
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading !== null}
        />
        <ToolbarButton icon={ICONS.table} label="Insert table" onClick={insertTable} />
        <ToolbarButton icon={ICONS.code} label="Insert code block" onClick={insertCodeBlock} />
        <ToolbarButton icon={ICONS.embed} label="Embed YouTube/Vimeo video" onClick={handleEmbedVideo} />
      </div>
      <div className="editor-toolbar-sep" />
      <div className="editor-toolbar-group">
        <ToolbarButton icon={ICONS.upload} label="Import a .md file" onClick={() => mdInputRef.current?.click()} />
      </div>

      <input ref={mdInputRef} type="file" accept=".md,text/markdown,text/plain" hidden onChange={handleMarkdownImport} />
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(e) => handleMediaUpload(e, "image")} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => handleMediaUpload(e, "video")} />

      {error && <div className="form-error" style={{ width: "100%" }}>{error}</div>}
    </div>
  );
}
