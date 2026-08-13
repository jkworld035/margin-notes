import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--rule)",
        padding: "2rem clamp(1rem,4vw,3rem)",
        marginTop: "3rem",
        display: "flex",
        gap: "1.5rem",
        flexWrap: "wrap",
        fontSize: ".82rem",
        color: "var(--muted)",
      }}
    >
      <span>&copy; {new Date().getFullYear()} Margin Notes</span>
      <Link href="/privacy" style={{ color: "inherit" }}>
        Privacy Policy
      </Link>
      <a href="/rss.xml" style={{ color: "inherit" }}>
        RSS Feed
      </a>
    </footer>
  );
}
