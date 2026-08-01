"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/auth";

export default function EditProfile({
  initialName,
  initialBio,
}: {
  initialName: string;
  initialBio: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!editing) {
    return (
      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
        Edit Profile
      </button>
    );
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await updateProfile(formData);
    setPending(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setEditing(false);
    }
  }

  return (
    <form action={action} style={{ width: "100%", marginTop: "1rem" }}>
      {error && <div className="form-error">{error}</div>}
      <div className="form-group">
        <label>Name</label>
        <input name="name" type="text" defaultValue={initialName} maxLength={80} required />
      </div>
      <div className="form-group">
        <label>Bio</label>
        <input
          name="bio"
          type="text"
          defaultValue={initialBio}
          maxLength={200}
          placeholder="A short line about you…"
        />
      </div>
      <div style={{ display: "flex", gap: ".6rem" }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
