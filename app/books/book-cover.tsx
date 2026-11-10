// A book cover: the author's image when there is one, otherwise a
// typographic cover generated from the title.

const PALETTES: [string, string][] = [
  ["#7a2e1d", "#d4522a"],
  ["#1f3a5f", "#3f7cac"],
  ["#2d4a3e", "#5f9c7a"],
  ["#4a2c5a", "#9b6bb0"],
  ["#5a4a1f", "#c4a24a"],
  ["#2b2b33", "#6b6b7a"],
  ["#5a1f3a", "#c4507f"],
];

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export default function BookCover({
  title,
  author,
  src,
}: {
  title: string;
  author?: string;
  src?: string | null;
}) {
  if (src) {
    return (
      <div className="bk-cover">
        <img src={src} alt={title} />
      </div>
    );
  }

  const [from, to] = PALETTES[hash(title) % PALETTES.length];

  return (
    <div
      className="bk-cover bk-cover-art"
      style={{ background: `linear-gradient(155deg, ${from}, ${to})` }}
      aria-label={title}
    >
      <span className="bk-cover-rule" />
      <span className="bk-cover-title">{title}</span>
      {author && <span className="bk-cover-author">{author}</span>}
    </div>
  );
}
