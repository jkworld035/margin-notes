"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/app/actions/auth";

export default function AvatarUpload({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be under 3MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    setUrl(data.publicUrl);
    await updateAvatarUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      {url ? (
        <img
          src={url}
          alt=""
          style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <div className="profile-avatar-lg" />
      )}
      <div>
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        {uploading && <p style={{ fontSize: ".78rem", color: "var(--muted)" }}>Uploading…</p>}
        {error && <div className="form-error">{error}</div>}
      </div>
    </div>
  );
}
