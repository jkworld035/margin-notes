import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Margin Notes",
  description: "Get in touch with the Margin Notes team.",
};

export default function ContactPage() {
  return (
    <div className="write-page">
      <h2>Contact Us</h2>
      <p className="sub">Questions, feedback, or something to report — we&apos;d like to hear from you.</p>

      <div style={{ maxWidth: "560px" }}>
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--rule)",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: ".75rem",
                fontWeight: 500,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: ".4rem",
              }}
            >
              Email
            </div>
            <a
              href="mailto:jkworld035@gmail.com"
              style={{
                fontFamily: "var(--serif)",
                fontSize: "1.4rem",
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              jkworld035@gmail.com
            </a>
          </div>

          <p style={{ color: "var(--muted)", fontSize: ".9rem", fontWeight: 300, lineHeight: 1.7 }}>
            Whether it&apos;s a bug report, a content concern, a partnership idea, or just feedback on the
            site — reach out any time. We aim to respond within a few days.
          </p>

          <a href="mailto:jkworld035@gmail.com" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>
            Send an Email
          </a>
        </div>
      </div>
    </div>
  );
}
