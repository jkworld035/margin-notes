"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FontKey = "serif" | "sans" | "display" | "mono";
type Align = "left" | "center" | "right";
type Deco = "frame" | "fog" | "bar" | "circles" | "stars" | "grid" | "vignette" | "sun" | "rule" | "blobs";

type Template = {
  id: string;
  label: string;
  bgA: string;
  bgB: string;
  text: string;
  accent: string;
  font: FontKey;
  deco: Deco;
  align: Align;
};

const TEMPLATES: Template[] = [
  { id: "mystery", label: "Mystery", bgA: "#10131a", bgB: "#2a3342", text: "#e9e4d8", accent: "#c9a85c", font: "serif", deco: "fog", align: "center" },
  { id: "thriller", label: "Thriller", bgA: "#0b0b0d", bgB: "#3a0d10", text: "#ffffff", accent: "#e0282e", font: "display", deco: "bar", align: "left" },
  { id: "romance", label: "Romance", bgA: "#f7d6dc", bgB: "#e58aa0", text: "#5a1630", accent: "#ffffff", font: "serif", deco: "circles", align: "center" },
  { id: "fantasy", label: "Fantasy", bgA: "#2a1450", bgB: "#6b3fa0", text: "#f5e6b8", accent: "#f0c75e", font: "serif", deco: "stars", align: "center" },
  { id: "scifi", label: "Sci-Fi", bgA: "#04101f", bgB: "#0c4a6e", text: "#bdf2ff", accent: "#27d3ff", font: "sans", deco: "grid", align: "left" },
  { id: "horror", label: "Horror", bgA: "#050505", bgB: "#2b0505", text: "#f2f2f2", accent: "#b30d0d", font: "display", deco: "vignette", align: "center" },
  { id: "business", label: "Business", bgA: "#ffffff", bgB: "#e8edf5", text: "#0f2547", accent: "#1f5fd1", font: "sans", deco: "bar", align: "left" },
  { id: "biography", label: "Biography", bgA: "#efe3c8", bgB: "#d9c59a", text: "#3b2a14", accent: "#7a5a2a", font: "serif", deco: "frame", align: "center" },
  { id: "selfhelp", label: "Self-Help", bgA: "#ffb347", bgB: "#ff6b4a", text: "#ffffff", accent: "#fff3d6", font: "sans", deco: "sun", align: "center" },
  { id: "kids", label: "Children's", bgA: "#ffe66d", bgB: "#6be3c8", text: "#2b2a6b", accent: "#ff6b8a", font: "display", deco: "blobs", align: "center" },
  { id: "minimal", label: "Minimal", bgA: "#fafafa", bgB: "#f0f0f0", text: "#111111", accent: "#111111", font: "serif", deco: "rule", align: "left" },
];

const FONTS: Record<FontKey, { label: string; stack: string; weight: string }> = {
  serif: { label: "Classic serif", stack: 'Georgia, "Times New Roman", serif', weight: "700" },
  sans: { label: "Modern sans", stack: '"Helvetica Neue", Arial, sans-serif', weight: "700" },
  display: { label: "Bold display", stack: 'Impact, "Arial Black", sans-serif', weight: "400" },
  mono: { label: "Typewriter", stack: '"Courier New", monospace', weight: "700" },
};

type Config = {
  template: Template;
  title: string;
  subtitle: string;
  author: string;
  bgA: string;
  bgB: string;
  text: string;
  accent: string;
  font: FontKey;
  align: Align;
  titleSize: number;
  posY: number;
  overlay: number;
};

const W = 800;
const H = 1200;
const MARGIN = 80;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawDeco(ctx: CanvasRenderingContext2D, deco: Deco, accent: string) {
  ctx.save();
  switch (deco) {
    case "frame":
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.lineWidth = 2;
      ctx.strokeRect(58, 58, W - 116, H - 116);
      break;
    case "fog": {
      for (let i = 0; i < 6; i++) {
        const g = ctx.createRadialGradient(150 + i * 120, 900 - (i % 3) * 110, 10, 150 + i * 120, 900 - (i % 3) * 110, 260);
        g.addColorStop(0, "rgba(255,255,255,0.10)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, W - 100, H - 100);
      break;
    }
    case "bar":
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 44, H);
      ctx.fillRect(MARGIN, H - 150, 120, 10);
      break;
    case "circles":
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (const [x, y, r] of [[640, 220, 190], [140, 1000, 150], [700, 900, 90]]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "stars": {
      ctx.fillStyle = accent;
      let seed = 7;
      for (let i = 0; i < 70; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const x = (seed / 233280) * W;
        seed = (seed * 9301 + 49297) % 233280;
        const y = (seed / 233280) * H;
        ctx.globalAlpha = 0.25 + ((i * 37) % 60) / 100;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "grid":
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.fillRect(MARGIN, 90, 90, 8);
      break;
    case "vignette": {
      const g = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 760);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = accent;
      ctx.fillRect(W / 2 - 3, 60, 6, 140);
      break;
    }
    case "sun": {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.arc(W / 2, 1050, 330, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(W / 2, 1050, 190, Math.PI, 0);
      ctx.fill();
      break;
    }
    case "blobs":
      for (const [x, y, r, c] of [[90, 130, 100, "#ff6b8a"], [700, 200, 70, "#ffffff"], [650, 1020, 150, "#ff6b8a"], [130, 1050, 80, "#ffffff"]] as [number, number, number, string][]) {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    case "rule":
      ctx.fillStyle = accent;
      ctx.fillRect(MARGIN, 120, W - MARGIN * 2, 3);
      ctx.fillRect(MARGIN, H - 150, W - MARGIN * 2, 3);
      break;
  }
  ctx.restore();
}

export function drawCover(canvas: HTMLCanvasElement, cfg: Config, image: HTMLImageElement | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;

  const g = ctx.createLinearGradient(0, 0, W * 0.6, H);
  g.addColorStop(0, cfg.bgA);
  g.addColorStop(1, cfg.bgB);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (image) {
    const scale = Math.max(W / image.width, H / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
    ctx.fillStyle = `rgba(0,0,0,${cfg.overlay})`;
    ctx.fillRect(0, 0, W, H);
  } else {
    drawDeco(ctx, cfg.template.deco, cfg.accent);
  }

  const font = FONTS[cfg.font];
  const x = cfg.align === "left" ? MARGIN : cfg.align === "right" ? W - MARGIN : W / 2;
  ctx.textAlign = cfg.align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = cfg.text;

  const maxWidth = W - MARGIN * 2 - (cfg.template.deco === "bar" ? 20 : 0);
  const titleText = cfg.font === "display" ? cfg.title.toUpperCase() : cfg.title;

  ctx.font = `${font.weight} ${cfg.titleSize}px ${font.stack}`;
  const titleLines = wrap(ctx, titleText || "Your Title", maxWidth);
  const lh = cfg.titleSize * 1.15;

  const subSize = Math.round(cfg.titleSize * 0.36);
  ctx.font = `400 ${subSize}px ${FONTS[cfg.font === "display" ? "sans" : cfg.font].stack}`;
  const subLines = cfg.subtitle ? wrap(ctx, cfg.subtitle, maxWidth) : [];

  const blockH = titleLines.length * lh + (subLines.length ? 30 + subLines.length * subSize * 1.35 : 0);
  let y = Math.max(MARGIN + cfg.titleSize * 0.8, Math.min(H - 220 - blockH + cfg.titleSize * 0.8, H * cfg.posY - blockH / 2 + cfg.titleSize * 0.8));

  if (image) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 14;
  }

  ctx.font = `${font.weight} ${cfg.titleSize}px ${font.stack}`;
  for (const line of titleLines) {
    ctx.fillText(line, x, y);
    y += lh;
  }

  if (subLines.length) {
    y += 14;
    ctx.fillStyle = cfg.accent === cfg.text ? cfg.text : cfg.text;
    ctx.globalAlpha = 0.88;
    ctx.font = `400 ${subSize}px ${FONTS[cfg.font === "display" ? "sans" : cfg.font].stack}`;
    for (const line of subLines) {
      ctx.fillText(line, x, y);
      y += subSize * 1.35;
    }
    ctx.globalAlpha = 1;
  }

  if (cfg.author) {
    ctx.fillStyle = cfg.text;
    ctx.font = `600 34px ${FONTS[cfg.font === "display" ? "sans" : cfg.font].stack}`;
    const name = cfg.author.toUpperCase();
    // letter-spaced author name
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
    ctx.fillText(name, x, H - 90);
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  }

  ctx.shadowBlur = 0;
}

export default function CoverDesigner({
  initialTitle,
  onUploaded,
}: {
  initialTitle?: string;
  onUploaded: (url: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tpl, setTpl] = useState<Template>(TEMPLATES[0]);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [bgA, setBgA] = useState(TEMPLATES[0].bgA);
  const [bgB, setBgB] = useState(TEMPLATES[0].bgB);
  const [text, setText] = useState(TEMPLATES[0].text);
  const [accent, setAccent] = useState(TEMPLATES[0].accent);
  const [font, setFont] = useState<FontKey>(TEMPLATES[0].font);
  const [align, setAlign] = useState<Align>(TEMPLATES[0].align);
  const [titleSize, setTitleSize] = useState(96);
  const [posY, setPosY] = useState(0.42);
  const [overlay, setOverlay] = useState(0.45);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneUrl, setDoneUrl] = useState<string | null>(null);

  // Prefill the author name from the signed-in profile.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data } = await supabase.from("profiles").select("name").eq("id", auth.user.id).maybeSingle();
        if (!cancelled && data?.name) setAuthor((prev) => prev || data.name);
      } catch {
        // The author name can be typed by hand.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCover(canvas, { template: tpl, title, subtitle, author, bgA, bgB, text, accent, font, align, titleSize, posY, overlay }, image);
  }, [tpl, title, subtitle, author, bgA, bgB, text, accent, font, align, titleSize, posY, overlay, image]);

  const chooseTemplate = (t: Template) => {
    setTpl(t);
    setBgA(t.bgA);
    setBgB(t.bgB);
    setText(t.text);
    setAccent(t.accent);
    setFont(t.font);
    setAlign(t.align);
  };

  const onBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Choose an image under 5MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setError(null);
    };
    img.src = url;
  };

  async function useCover() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setBusy(true);
    setError(null);

    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create the image.");

      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You must be signed in.");

      const path = `${auth.user.id}/cover-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/png" });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      setDoneUrl(data.publicUrl);
      onUploaded(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cd">
      <div className="cd-preview">
        <canvas ref={canvasRef} aria-label="Cover preview" />
      </div>

      <div className="cd-controls">
        <div className="cd-templates" role="radiogroup" aria-label="Cover style">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tpl.id === t.id}
              onClick={() => chooseTemplate(t)}
              className={tpl.id === t.id ? "on" : ""}
            >
              <span style={{ background: `linear-gradient(155deg, ${t.bgA}, ${t.bgB})`, border: "1px solid var(--rule)" }} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="form-group"><label>Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} /></div>
        <div className="form-group"><label>Subtitle (optional)</label><input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={120} /></div>
        <div className="form-group"><label>Author name</label><input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={80} /></div>

        <div className="cd-row">
          <label>Font
            <select value={font} onChange={(e) => setFont(e.target.value as FontKey)}>
              {Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
            </select>
          </label>
          <label>Align
            <select value={align} onChange={(e) => setAlign(e.target.value as Align)}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </label>
        </div>

        <div className="cd-row">
          <label>Title size <input type="range" min={48} max={150} value={titleSize} onChange={(e) => setTitleSize(Number(e.target.value))} /></label>
          <label>Text position <input type="range" min={0.2} max={0.75} step={0.01} value={posY} onChange={(e) => setPosY(Number(e.target.value))} /></label>
        </div>

        <div className="cd-row cd-colors">
          <label>Background <input type="color" value={bgA} onChange={(e) => setBgA(e.target.value)} /></label>
          <label>Fade to <input type="color" value={bgB} onChange={(e) => setBgB(e.target.value)} /></label>
          <label>Text <input type="color" value={text} onChange={(e) => setText(e.target.value)} /></label>
          <label>Accent <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label>
        </div>

        <div className="cd-row">
          <label>Background photo (optional) <input type="file" accept="image/*" onChange={onBackground} /></label>
          {image && (
            <label>Darken photo <input type="range" min={0} max={0.85} step={0.01} value={overlay} onChange={(e) => setOverlay(Number(e.target.value))} /></label>
          )}
        </div>
        {image && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImage(null)}>Remove photo</button>
        )}

        {error && <div className="form-error">{error}</div>}

        <div style={{ display: "flex", gap: ".7rem", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={useCover} disabled={busy || !title.trim()}>
            {busy ? "Saving…" : "Use this cover"}
          </button>
          {doneUrl && <span style={{ fontSize: ".82rem", color: "var(--green)" }}>✓ Cover set. Remember to save your book.</span>}
        </div>
      </div>
    </div>
  );
}
