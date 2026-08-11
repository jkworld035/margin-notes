"use client";

import { useState } from "react";
import { reportContent } from "@/app/actions/social";

export default function ReportButton({ postId, commentId }: { postId?: string; commentId?: string }) {
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await reportContent({ postId, commentId, reason });
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    setOpen(false);
  }

  if (done) {
    return (
      <span className="btn btn-ghost btn-sm" style={{ cursor: "default", opacity: 0.7 }}>
        Reported
      </span>
    );
  }

  if (!open) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Report
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: ".5rem", width: "100%" }}>
      {error && <div className="form-error">{error}</div>}
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="What's the issue?"
        maxLength={300}
        required
        style={{ marginBottom: ".4rem" }}
      />
      <div style={{ display: "flex", gap: ".4rem" }}>
        <button className="btn btn-danger btn-sm" type="submit" disabled={pending}>
          {pending ? "Sending…" : "Submit Report"}
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
