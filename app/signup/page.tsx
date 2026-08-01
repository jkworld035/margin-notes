"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await signUp(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <h2>Create your account</h2>
        <p className="sub">Join the community and start writing.</p>
        {error && <div className="form-error">{error}</div>}
        <form action={action}>
          <div className="form-group">
            <label>Name</label>
            <input name="name" type="text" required placeholder="Your name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" required minLength={6} placeholder="At least 6 characters" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Creating account…" : "Sign Up"}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account? <Link href="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
