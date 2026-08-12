"use client";

import { useState, useEffect } from "react";
import { addCoAuthor, removeCoAuthor } from "@/app/actions/posts";
import { createClient } from "@/lib/supabase/client";

export default function CoAuthorPanel({
  postId,
  coAuthorIds,
  onChange,
}: {
  postId: string;
  coAuthorIds: string[];
  onChange: () => void;
}) {
  const [names, setNames] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    async function loadNames() {
      if (coAuthorIds.length === 0) return;
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("id, name").in("id", coAuthorIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p) => (map[p.id] = p.name));
      setNames(map);
    }
    loadNames();
  }, [coAuthorIds]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await addCoAuthor(postId, email);
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setEmail("");
    onChange();
  }

  async function handleRemove(id: string) {
    setPending(true);
    await removeCoAuthor(postId, id);
    setPending(false);
    onChange();
  }

  return (
    <div className="form-group">
      <label>Collaborators</label>
      {coAuthorIds.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginBottom: ".6rem" }}>
          {coAuthorIds.map((id) => (
            <span key={id} className="tag-chip" style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
              {names[id] || "…"}
              <button
                type="button"
                onClick={() => handleRemove(id)}
                disabled={pending}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: ".9rem" }}
                title="Remove collaborator"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: ".5rem" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add collaborator by email…"
          style={{ flex: 1 }}
        />
        <button className="btn btn-neutral btn-sm" type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      <div className="form-hint">
        Collaborators can edit and delete this story, and appear in the byline. This isn&apos;t live simultaneous
        editing — changes save whenever either of you clicks Save.
      </div>
    </div>
  );
}
