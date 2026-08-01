"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await signIn(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <h2>Welcome back</h2>
        <p className="sub">Log in to write and manage your posts.</p>
        {error && <div className="form-error">{error}</div>}
        <form action={action}>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" required placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Logging in…" : "Log In"}
          </button>
        </form>
        <div className="auth-switch">
          New here? <Link href="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
