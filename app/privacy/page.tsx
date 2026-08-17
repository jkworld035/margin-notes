import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Margin Notes",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="write-page">
      <h2>Privacy Policy</h2>
      <p className="sub">Last updated {new Date().toLocaleDateString()}</p>

      <div style={{ maxWidth: "680px", lineHeight: 1.8, fontSize: ".95rem" }}>
        <p style={{ marginBottom: "1.2rem" }}>
          Margin Notes (&quot;we&quot;, &quot;us&quot;) operates this website. This page explains what
          information we collect, how we use it, and the choices you have.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          Information we collect
        </h3>
        <p style={{ marginBottom: "1.2rem" }}>
          When you create an account, we collect your name and email address. If you sign in with
          Google, we receive your name, email, and profile photo from Google. When you use the site,
          we store the content you publish (stories, comments), your interactions (claps, bookmarks,
          follows), and basic usage data such as which pages you view.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          Cookies and similar technologies
        </h3>
        <p style={{ marginBottom: "1.2rem" }}>
          We use cookies to keep you signed in and to remember your theme preference. We also use
          privacy-focused analytics (Vercel Analytics and Speed Insights) to understand overall site
          usage and performance; these do not use tracking cookies. If third-party advertising is
          enabled on this site, ad providers such as Google may use cookies to show relevant ads and
          measure ad performance — you can control ad personalization through{" "}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "underline" }}
          >
            Google&apos;s Ads Settings
          </a>
          .
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          How we use information
        </h3>
        <p style={{ marginBottom: "1.2rem" }}>
          We use your information to operate the site: displaying your stories and profile, sending
          you notifications about activity on your content, and moderating content that violates our
          guidelines. We do not sell your personal information.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          Your choices
        </h3>
        <p style={{ marginBottom: "1.2rem" }}>
          You can edit or delete your stories, update your profile, or delete your account at any
          time. Content you publish is visible to the public by design, since this is a publishing
          platform — deleting a story removes it from public view.
        </p>

        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" }}>
          Contact
        </h3>
        <p>
          Questions about this policy can be sent to{" "}
          <a href="mailto:jkworld035@gmail.com" style={{ color: "var(--accent)", textDecoration: "underline" }}>
            jkworld035@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
