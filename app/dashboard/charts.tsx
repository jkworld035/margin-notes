import { formatInr, shortInr, type MonthPoint } from "@/lib/author-stats";

// Rounds a maximum up to a tidy axis value (1, 2, 5 × 10ⁿ).
function niceMax(value: number): number {
  if (value <= 0) return 10000; // ₹100, so an empty chart still has a scale
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const n = value / magnitude;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * magnitude;
}

// ---------- Monthly revenue: stacked bars ----------

export function RevenueBarChart({
  data,
  primaryLabel = "Your earnings",
  secondaryLabel = "Margin Notes share",
  id = "rev",
}: {
  data: MonthPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  id?: string;
}) {
  const W = 640;
  const H = 260;
  const padL = 52;
  const padR = 12;
  const padT = 14;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxTotal = Math.max(0, ...data.map((d) => d.earnings + d.platform));
  const top = niceMax(maxTotal);
  const band = innerW / Math.max(1, data.length);
  const barW = Math.min(46, band * 0.55);
  const hasData = maxTotal > 0;

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Monthly revenue chart">
        <defs>
          <linearGradient id={`${id}-primary`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0.65 }} />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = padT + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} style={{ stroke: "var(--rule)" }} strokeWidth={1} strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" style={{ fill: "var(--muted)" }}>
                {shortInr(top * t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = padL + i * band + (band - barW) / 2;
          const hE = (d.earnings / top) * innerH;
          const hP = (d.platform / top) * innerH;
          const baseY = padT + innerH;
          return (
            <g key={d.key}>
              <title>{`${d.label}: you earned ${formatInr(d.earnings)} · Margin Notes share ${formatInr(d.platform)}`}</title>
              {hE > 0 && <rect x={x} y={baseY - hE} width={barW} height={hE} rx={4} fill={`url(#${id}-primary)`} />}
              {hP > 0 && (
                <rect x={x} y={baseY - hE - hP} width={barW} height={hP} rx={4} style={{ fill: "var(--ink)" }} opacity={0.22} />
              )}
              <text x={x + barW / 2} y={H - 9} textAnchor="middle" fontSize="11" style={{ fill: "var(--muted)" }}>
                {d.label}
              </text>
            </g>
          );
        })}

        {!hasData && (
          <text x={W / 2} y={padT + innerH / 2} textAnchor="middle" fontSize="13" style={{ fill: "var(--muted)" }}>
            Sales will appear here
          </text>
        )}
      </svg>

      <div style={{ display: "flex", gap: "1.2rem", fontSize: ".78rem", color: "var(--muted)", marginTop: ".3rem" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent)" }} />
          {primaryLabel}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: ".4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ink)", opacity: 0.22 }} />
          {secondaryLabel}
        </span>
      </div>
    </div>
  );
}

// ---------- Donut ----------

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  centerValue: string;
  centerLabel: string;
}) {
  const size = 160;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let offset = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: "var(--rule)" }} />
          {total > 0 &&
            segments.map((s) => {
              const len = (s.value / total) * C;
              const circle = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  strokeWidth={stroke}
                  stroke={s.color}
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>{`${s.label}: ${formatInr(s.value)}`}</title>
                </circle>
              );
              offset += len;
              return circle;
            })}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: "var(--serif)", fontSize: "1.35rem", lineHeight: 1.1 }}>{centerValue}</div>
          <div style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: ".2rem" }}>{centerLabel}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", width: "100%", fontSize: ".82rem" }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: ".5rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
              {s.label}
            </span>
            <span style={{ color: "var(--muted)" }}>
              {formatInr(s.value)}
              {total > 0 ? ` · ${Math.round((s.value / total) * 100)}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Horizontal bars (e.g. sales by book) ----------

export function HBarChart({
  items,
  emptyText = "Nothing to show yet",
}: {
  items: { label: string; value: number; display: string }[];
  emptyText?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (items.length === 0 || max === 0) {
    return <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>{emptyText}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: ".83rem", marginBottom: ".3rem" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
            <span style={{ color: "var(--muted)", flexShrink: 0 }}>{item.display}</span>
          </div>
          <div style={{ height: 8, background: "var(--rule)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(3, (item.value / max) * 100)}%`,
                background: "var(--accent)",
                opacity: 0.9,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}