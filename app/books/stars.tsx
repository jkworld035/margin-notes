// Read-only star rating (supports fractions, e.g. 4.3).
export default function Stars({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;

  return (
    <span
      className="stars"
      style={{ ["--pct" as string]: `${pct}%` }}
      role="img"
      aria-label={label ?? `${value.toFixed(1)} out of 5 stars`}
    >
      ★★★★★
    </span>
  );
}
