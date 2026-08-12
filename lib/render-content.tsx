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

function parseTable(lines: string[]): { header: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isSeparator = (l: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(l);

  if (!isRow(lines[0]) || !isSeparator(lines[1])) return null;

  const splitRow = (l: string) =>
    l
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const header = splitRow(lines[0]);
  const rows = lines.slice(2).filter((l) => isRow(l)).map(splitRow);
  if (rows.length === 0 && lines.length > 2) return null; // malformed, fall through to paragraph

  return { header, rows };
}

const CODE_KEYWORDS =
  /\b(function|const|let|var|return|if|else|for|while|import|export|from|class|def|print|public|static|void|int|new|this|async|await|try|catch|null|true|false|None|True|False)\b/g;

function highlightCode(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    const tokens: React.ReactNode[] = [];
    let rest = line;
    let key = 0;

    // comments (rest of line)
    const commentMatch = rest.match(/(\/\/.*$|#.*$)/);
    let trailingComment = "";
    if (commentMatch && commentMatch.index !== undefined) {
      trailingComment = rest.slice(commentMatch.index);
      rest = rest.slice(0, commentMatch.index);
    }

    // strings
    const parts = rest.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g);
    parts.forEach((part) => {
      if (/^["'].*["']$/.test(part)) {
        tokens.push(
          <span key={key++} style={{ color: "#c9a876" }}>
            {part}
          </span>
        );
        return;
      }
      const subParts = part.split(CODE_KEYWORDS);
      subParts.forEach((sub, si) => {
        if (si % 2 === 1) {
          tokens.push(
            <span key={key++} style={{ color: "#e26a42" }}>
              {sub}
            </span>
          );
        } else if (sub) {
          tokens.push(<React.Fragment key={key++}>{sub}</React.Fragment>);
        }
      });
    });

    if (trailingComment) {
      tokens.push(
        <span key={key++} style={{ color: "#8a8680" }}>
          {trailingComment}
        </span>
      );
    }

    return (
      <React.Fragment key={i}>
        {tokens}
        {i < lines.length - 1 && "\n"}
      </React.Fragment>
    );
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

    const codeMatch = trimmed.match(/^```([a-zA-Z0-9+#-]*)\n([\s\S]*?)\n?```$/);
    if (codeMatch) {
      const [, lang, code] = codeMatch;
      return (
        <div key={i} style={{ margin: "1.5rem 0" }}>
          {lang && (
            <div
              style={{
                fontSize: ".7rem",
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: ".3rem",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            style={{
              background: "var(--ink)",
              color: "#e8e4de",
              padding: "1.2rem",
              borderRadius: "4px",
              overflowX: "auto",
              fontSize: ".85rem",
              lineHeight: 1.6,
            }}
          >
            <code style={{ fontFamily: "monospace" }}>{highlightCode(code)}</code>
          </pre>
        </div>
      );
    }

    const tableMatch = parseTable(lines);
    if (tableMatch) {
      return (
        <table key={i} style={{ width: "100%", borderCollapse: "collapse", margin: "1.5rem 0" }}>
          <thead>
            <tr>
              {tableMatch.header.map((cell, ci) => (
                <th
                  key={ci}
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid var(--rule)",
                    padding: ".5rem .7rem",
                    fontFamily: "var(--serif)",
                    fontWeight: 600,
                  }}
                >
                  {renderInline(cell, `th${i}-${ci}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableMatch.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ borderBottom: "1px solid var(--rule)", padding: ".5rem .7rem" }}>
                    {renderInline(cell, `td${i}-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

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
