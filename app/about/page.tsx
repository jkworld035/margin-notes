import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Margin Notes",
  description: "What Margin Notes is, and who it's for.",
};

export default function AboutPage() {
  return (
    <div className="write-page">
      <h2>About Margin Notes</h2>
      <p className="sub">A place for long-form writing, without the noise.</p>

      <div style={{ maxWidth: "680px", lineHeight: 1.8, fontSize: ".95rem" }}>
        <p style={{ marginBottom: "1.2rem" }}>
          Margin Notes is a publishing platform for essays, stories, and ideas worth sitting with for
          more than a few seconds. It&apos;s built for readers who still enjoy a well-written piece, and
          for writers who want a clean, distraction-free place to publish one.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          What you&apos;ll find here
        </h3>
        <p style={{ marginBottom: "1.2rem" }}>
          Personal essays, opinion pieces, short fiction, and practical guides — written by people who
          wanted to say something and took the time to say it well. Stories are organized by category and
          tags, and every writer has their own profile you can follow.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          Who&apos;s behind it
        </h3>
        <p style={{ marginBottom: "1.2rem" }}>
          Margin Notes is an independent publishing project, built and maintained by its founder as a
          space free of the algorithmic noise that crowds out most writing online. It&apos;s a small,
          ongoing project — improved a little at a time.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          Want to write here?
        </h3>
        <p style={{ marginBottom: "1.2rem" }}>
          Anyone can sign up and publish — there&apos;s no submission process or approval queue. Your
          story goes live the moment you hit publish. We just ask that what you publish is your own,
          genuine work.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          Get in touch
        </h3>
        <p>
          Questions, feedback, or something to report? Visit our{" "}
          <a href="/contact" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            Contact page
          </a>
          .
        </p>
      </div>
    </div>
  );
}