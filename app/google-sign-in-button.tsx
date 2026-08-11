"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <button
      type="button"
      className="btn btn-neutral"
      onClick={handleClick}
      disabled={loading}
      style={{ width: "100%", marginTop: ".8rem" }}
    >
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
