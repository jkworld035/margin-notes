import React from "react";

// Renders **bold**, *italic*, [links](url), "# " headings, "> " quotes, and
// standalone ![alt](url) media lines (image or video, chosen by file extension)
// safely as React elements. Deliberately not using dangerouslySetInnerHTML —
// everything stays as text nodes or explicit elements.

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".ogg"];

function isVideoUrl(url: string) {
  const clean = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(ext));
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Split on bold, italic, or [text](url) links — whichever comes first
  const pattern = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\([^)\s]+\))/g;
  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part, i) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer nofollow"
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          {linkMatch[1]}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} style={{ fontWeight: 700 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>;
  });
}

export function renderContent(content: string): React.ReactNode[] {
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim());

  return blocks.map((block, i) => {
    const trimmed = block.trim();

    const mediaMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (mediaMatch) {
      const [, alt, url] = mediaMatch;
      if (isVideoUrl(url)) {
        return (
          <video
            key={i}
            src={url}
            controls
            style={{ width: "100%", borderRadius: "4px", margin: "1.5rem 0" }}
          />
        );
      }
      return (
        <img
          key={i}
          src={url}
          alt={alt}
          style={{ width: "100%", borderRadius: "4px", margin: "1.5rem 0" }}
        />
      );
    }

    const headingMatch = block.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const Tag = (`h${Math.min(level + 1, 4)}` as unknown) as "h2" | "h3" | "h4";
      return (
        <Tag key={i} style={{ fontFamily: "var(--serif)", fontWeight: 400, margin: "1.4rem 0 .6rem" }}>
          {renderInline(text, `h${i}`)}
        </Tag>
      );
    }

    const quoteMatch = block.match(/^>\s?([\s\S]*)$/);
    if (quoteMatch) {
      const lines = quoteMatch[1].split("\n").map((l) => l.replace(/^>\s?/, ""));
      return (
        <blockquote key={i}>
          {lines.map((line, j) => (
            <React.Fragment key={j}>
              {renderInline(line, `q${i}-${j}`)}
              {j < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </blockquote>
      );
    }

    const lines = block.split("\n");

    const bulletLines = lines.filter((l) => /^\s*[-*]\s+/.test(l));
    if (bulletLines.length === lines.length && lines.length > 0) {
      return (
        <ul key={i} style={{ margin: "1rem 0", paddingLeft: "1.4rem" }}>
          {lines.map((line, j) => (
            <li key={j} style={{ marginBottom: ".4rem" }}>
              {renderInline(line.replace(/^\s*[-*]\s+/, ""), `ul${i}-${j}`)}
            </li>
          ))}
        </ul>
      );
    }

    const numberedLines = lines.filter((l) => /^\s*\d+\.\s+/.test(l));
    if (numberedLines.length === lines.length && lines.length > 0) {
      return (
        <ol key={i} style={{ margin: "1rem 0", paddingLeft: "1.4rem" }}>
          {lines.map((line, j) => (
            <li key={j} style={{ marginBottom: ".4rem" }}>
              {renderInline(line.replace(/^\s*\d+\.\s+/, ""), `ol${i}-${j}`)}
            </li>
          ))}
        </ol>
      );
    }

    return (
      <p key={i}>
        {lines.map((line, j) => (
          <React.Fragment key={j}>
            {renderInline(line, `p${i}-${j}`)}
            {j < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}
