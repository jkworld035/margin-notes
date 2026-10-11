import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAuthorBookStats, formatInr } from "@/lib/author-stats";
import { RevenueBarChart, DonutChart, HBarChart } from "./charts";
import PayoutPanel from "./payout-panel";

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  padding: "1.4rem",
};

const cardTitle: React.CSSProperties = {
  fontFamily: "var(--serif)",
  fontWeight: 400,
  fontSize: "1.05rem",
  marginBottom: "1rem",
};

function StatCard({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "accent" | "green";
}) {
  const color = tone === "accent" ? "var(--accent)" : tone === "green" ? "var(--green, #2f7d4f)" : "var(--ink)";
  return (
    <div style={{ ...card, borderTop: `3px solid ${tone === "ink" ? "var(--rule)" : color}`, padding: "1.1rem 1.2rem" }}>
      <div style={{ fontSize: ".72rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: "1.9rem", lineHeight: 1.2, margin: ".35rem 0 .15rem", color }}>
        {value}
      </div>
      {hint && <div style={{ fontSize: ".76rem", color: "var(--muted)" }}>{hint}</div>}
    </div>
  );
}

export default async function BooksSection({ userId }: { userId: string }) {
  const supabase = await createClient();
  const stats = await getAuthorBookStats(supabase, userId);

  const hasBooks = stats.publishedCount + stats.draftCount > 0;

  if (!hasBooks) {
    return (
      <section style={{ ...card, marginBottom: "2.5rem", textAlign: "center", padding: "2.2rem 1.5rem" }}>
        <div style={{ fontSize: "1.8rem", marginBottom: ".5rem" }}>📚</div>
        <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.3rem", marginBottom: ".4rem" }}>
          Publish your first book
        </h2>
        <p style={{ color: "var(--muted)", fontSize: ".9rem", maxWidth: 460, margin: "0 auto 1.2rem" }}>
          Pick a template for your genre, write your chapters, and sell it to readers. You keep{" "}
          {stats.settings.authorSharePercent}% of every sale.
        </p>
        <Link href="/books/new" className="btn btn-primary btn-sm">
          Start a book
        </Link>
      </section>
    );
  }

  const bestSeller = stats.books.find((b) => b.sales > 0);
  const avgSale = stats.totalSales > 0 ? Math.round(stats.gross / stats.totalSales) : 0;

  return (
    <section style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: ".8rem", marginBottom: "1.2rem" }}>
        <div>
          <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.5rem" }}>Book sales &amp; earnings</h2>
          <p style={{ color: "var(--muted)", fontSize: ".85rem", marginTop: ".2rem" }}>
            You earn {stats.settings.authorSharePercent}% of every sale.
          </p>
        </div>
        <Link href="/books/new" className="btn btn-primary btn-sm">
          + New book
        </Link>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem", marginBottom: "1.4rem" }}>
        <StatCard label="Books published" value={String(stats.publishedCount)} hint={`${stats.draftCount} in draft`} />
        <StatCard label="Copies sold" value={String(stats.totalSales)} hint={bestSeller ? `Top: ${bestSeller.title}` : "No sales yet"} />
        <StatCard label="Total revenue" value={formatInr(stats.gross)} hint={stats.totalSales > 0 ? `${formatInr(avgSale)} per sale` : undefined} />
        <StatCard label="Your earnings" value={formatInr(stats.earnings)} tone="accent" hint={`${stats.settings.authorSharePercent}% author share`} />
        <StatCard label="Available to withdraw" value={formatInr(stats.available)} tone="green" hint="Cleared and ready" />
        <StatCard label="Clearing" value={formatInr(stats.clearing)} hint={`Clears after ${stats.settings.holdDays} days`} />
        <StatCard label="Payout in review" value={formatInr(stats.inReview)} />
        <StatCard label="Paid out" value={formatInr(stats.paidOut)} />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ ...card, gridColumn: "span 2", minWidth: 0 }}>
          <h3 style={cardTitle}>Revenue by month</h3>
          <RevenueBarChart data={stats.months} />
        </div>
        <div style={card}>
          <h3 style={cardTitle}>Where each sale goes</h3>
          <DonutChart
            centerValue={formatInr(stats.gross)}
            centerLabel="total sales"
            segments={[
              { label: "Your earnings", value: stats.earnings, color: "var(--accent)" },
              { label: "Margin Notes share", value: stats.platformShare, color: "var(--muted)" },
            ]}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <div style={card}>
          <h3 style={cardTitle}>Copies sold by book</h3>
          <HBarChart
            emptyText="No copies sold yet."
            items={stats.books
              .filter((b) => b.sales > 0)
              .slice(0, 5)
              .map((b) => ({
                label: b.title,
                value: b.sales,
                display: `${b.sales} ${b.sales === 1 ? "copy" : "copies"}`,
              }))}
          />
        </div>

        <div style={card}>
          <h3 style={cardTitle}>Recent sales</h3>
          {stats.recentSales.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>Your sales will show up here.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {stats.recentSales.map((s) => (
                <div
                  key={s.id}
                  style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: ".6rem 0", borderBottom: "1px solid var(--rule)", fontSize: ".85rem" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.bookTitle}</div>
                    <div style={{ color: "var(--muted)", fontSize: ".74rem" }}>
                      {s.paidAt ? new Date(s.paidAt).toLocaleDateString("en-IN") : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: "var(--accent)" }}>+{formatInr(s.earnings)}</div>
                    <div style={{ color: "var(--muted)", fontSize: ".74rem" }}>of {formatInr(s.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Per-book table */}
      <div style={{ ...card, marginBottom: "1rem", overflowX: "auto" }}>
        <h3 style={cardTitle}>Your books</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem", minWidth: 560 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: ".72rem", letterSpacing: ".06em", textTransform: "uppercase" }}>
              <th style={{ padding: ".4rem .5rem .6rem 0" }}>Book</th>
              <th style={{ padding: ".4rem .5rem .6rem" }}>Status</th>
              <th style={{ padding: ".4rem .5rem .6rem" }}>Price</th>
              <th style={{ padding: ".4rem .5rem .6rem" }}>Sold</th>
              <th style={{ padding: ".4rem .5rem .6rem" }}>Revenue</th>
              <th style={{ padding: ".4rem 0 .6rem .5rem", textAlign: "right" }}>You earned</th>
            </tr>
          </thead>
          <tbody>
            {stats.books.map((b) => (
              <tr key={b.id} style={{ borderTop: "1px solid var(--rule)" }}>
                <td style={{ padding: ".7rem .5rem .7rem 0" }}>
                  <Link href={`/books/${b.id}/edit`} style={{ color: "var(--ink)" }}>
                    {b.title}
                  </Link>
                </td>
                <td style={{ padding: ".7rem .5rem" }}>
                  <span style={{ color: b.status === "published" ? "var(--green, #2f7d4f)" : "var(--muted)" }}>{b.status}</span>
                </td>
                <td style={{ padding: ".7rem .5rem" }}>{b.priceInr > 0 ? `₹${b.priceInr}` : "Free"}</td>
                <td style={{ padding: ".7rem .5rem" }}>{b.sales}</td>
                <td style={{ padding: ".7rem .5rem" }}>{formatInr(b.gross)}</td>
                <td style={{ padding: ".7rem 0 .7rem .5rem", textAlign: "right", color: "var(--accent)" }}>{formatInr(b.earnings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Getting paid */}
      <PayoutPanel
        available={stats.available}
        clearing={stats.clearing}
        inReview={stats.inReview}
        paidOut={stats.paidOut}
        settings={stats.settings}
        details={stats.details}
        payouts={stats.payouts}
      />
    </section>
  );
}