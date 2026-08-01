import React from "react";

// Renders **bold**, *italic*, and "# " / "## " headings safely as React elements.
// Deliberately not using dangerouslySetInnerHTML — everything stays as text nodes.

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
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
