"use client";

import { useState } from "react";
import { TEMPLATES } from "./templates";

export default function TemplatesButton({
  content,
  onInsert,
}: {
  content: string;
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function handlePick(templateContent: string) {
    if (content.trim() && !confirm("This will replace your current content. Continue?")) {
      return;
    }
    onInsert(templateContent);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="btn btn-neutral btn-sm" onClick={() => setOpen((o) => !o)}>
        📝 Use a Template
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + .5rem)",
              left: 0,
              zIndex: 41,
              background: "var(--card)",
              border: "1px solid var(--rule)",
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
              width: "320px",
              maxHeight: "380px",
              overflowY: "auto",
            }}
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePick(t.content)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: ".9rem 1.1rem",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid var(--rule)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontFamily: "var(--serif)", fontSize: ".98rem" }}>{t.label}</div>
                <div style={{ fontSize: ".78rem", color: "var(--muted)", marginTop: ".2rem" }}>
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}