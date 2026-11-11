import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Margin Notes",
  description: "The rules for reading, writing and buying on Margin Notes.",
};

const h3 = { fontFamily: "var(--serif)", fontWeight: 400, margin: "1.6rem 0 .6rem" } as const;
const p = { marginBottom: "1.2rem" } as const;

export default function TermsPage() {
  return (
    <div className="write-page">
      <h2>Terms of Service</h2>
      <p className="sub">Last updated November 2026</p>

      <div style={{ maxWidth: "680px", lineHeight: 1.8, fontSize: ".95rem" }}>
        <p style={p}>
          By using Margin Notes you agree to these terms. If you do not agree, please do not use the site.
        </p>

        <h3 style={h3}>Your account</h3>
        <p style={p}>
          You are responsible for your account and everything done through it. Give accurate information and keep
          your sign-in details private. We may suspend accounts that break these terms.
        </p>

        <h3 style={h3}>Your content</h3>
        <p style={p}>
          You keep ownership of the stories and books you publish. By publishing, you give Margin Notes permission to
          display, distribute and promote them on the site. Only publish work that is your own or that you have the
          right to publish. Do not post plagiarised, hateful, illegal, misleading or sexually explicit content, spam,
          or content that infringes someone else&apos;s rights. We may remove content that breaks these rules.
        </p>

        <h3 style={h3}>Paid books and payouts</h3>
        <p style={p}>
          Authors can sell books on the platform. Payments are processed by Razorpay. A purchase gives the buyer
          access to that book for personal reading; it may not be copied or resold. Authors receive their share of
          each sale after the platform commission and a hold period, and payouts are made to the details the author
          provides. Refund requests are handled case by case; contact us through the Contact page.
        </p>

        <h3 style={h3}>Advertising</h3>
        <p style={p}>
          The site may show ads from third parties such as Google. See our Privacy Policy for how cookies are used.
        </p>

        <h3 style={h3}>Disclaimer</h3>
        <p style={p}>
          The site is provided as is. Content is written by users and does not represent advice from Margin Notes.
          We are not liable for losses arising from use of the site, to the extent permitted by law.
        </p>

        <h3 style={h3}>Changes and contact</h3>
        <p style={p}>
          We may update these terms; continued use means you accept the changes. Questions? Use the Contact page.
        </p>
      </div>
    </div>
  );
}
