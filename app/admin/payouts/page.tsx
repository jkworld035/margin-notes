import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatInr, monthSeries } from "@/lib/author-stats";
import { RevenueBarChart } from "@/app/dashboard/charts";
import { PayoutActions, SettingsForm } from "./payout-admin";

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  padding: "1.4rem",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ ...card, padding: "1.1rem 1.2rem" }}>
      <div style={{ fontSize: ".72rem", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: "1.8rem", margin: ".3rem 0 .1rem" }}>{value}</div>
      {hint && <div style={{ fontSize: ".76rem", color: "var(--muted)" }}>{hint}</div>}
    </div>
  );
}

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/");

  const [settingsRes, purchasesRes, payoutsRes] = await Promise.all([
    supabase.from("platform_settings").select("author_share_percent, min_payout_inr, hold_days").eq("id", 1).maybeSingle(),
    supabase
      .from("book_purchases")
      .select("amount_paise, author_amount_paise, platform_amount_paise, paid_at")
      .eq("status", "paid"),
    supabase
      .from("author_payouts")
      .select(
        "id, amount_paise, status, payout_method, payout_destination, reference, admin_note, requested_at, processed_at, profiles!author_payouts_author_id_fkey(name, email)"
      )
      .order("requested_at", { ascending: false })
      .limit(100),
  ]);

  const settings = {
    authorSharePercent: settingsRes.data?.author_share_percent ?? 60,
    minPayoutInr: settingsRes.data?.min_payout_inr ?? 100,
    holdDays: settingsRes.data?.hold_days ?? 7,
  };

  const purchases: any[] = purchasesRes.data || [];
  const payouts: any[] = payoutsRes.data || [];

  const gross = purchases.reduce((sum, p) => sum + p.amount_paise, 0);
  const authorTotal = purchases.reduce((sum, p) => sum + (p.author_amount_paise ?? 0), 0);
  const commission = purchases.reduce((sum, p) => sum + (p.platform_amount_paise ?? 0), 0);

  const requested = payouts.filter((p) => p.status === "requested");
  const settled = payouts.filter((p) => p.status !== "requested");
  const paidOut = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount_paise, 0);
  const requestedTotal = requested.reduce((sum, p) => sum + p.amount_paise, 0);
  const stillOwed = Math.max(0, authorTotal - paidOut);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>Payouts</h2>
        <p>Pay authors for their book sales and manage the commission.</p>
      </div>

      <div className="admin-tabs">
        <Link href="/admin" className="admin-tab">
          Posts
        </Link>
        <Link href="/admin/members" className="admin-tab">
          Members
        </Link>
        <span className="admin-tab active">Payouts</span>
        <Link href="/admin/reports" className="admin-tab">
          Reports
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "1rem", marginBottom: "1.4rem" }}>
        <Stat label="Gross sales" value={formatInr(gross)} hint={`${purchases.length} paid purchases`} />
        <Stat label="Margin Notes commission" value={formatInr(commission)} />
        <Stat label="Author earnings" value={formatInr(authorTotal)} />
        <Stat label="Owed to authors" value={formatInr(stillOwed)} hint="Earned, not yet paid out" />
        <Stat label="Awaiting your payment" value={formatInr(requestedTotal)} hint={`${requested.length} request${requested.length === 1 ? "" : "s"}`} />
        <Stat label="Paid out" value={formatInr(paidOut)} />
      </div>

      <div style={{ ...card, marginBottom: "1.4rem" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.05rem", marginBottom: "1rem" }}>
          Platform revenue by month
        </h3>
        <RevenueBarChart
          data={monthSeries(purchases)}
          primaryLabel="Author earnings"
          secondaryLabel="Margin Notes commission"
          id="admin-rev"
        />
      </div>

      <div style={{ ...card, marginBottom: "1.4rem" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.05rem", marginBottom: "1rem" }}>
          Payout requests to pay
        </h3>
        {requested.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".88rem" }}>Nothing waiting. All caught up.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {requested.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  padding: "1rem 0",
                  borderTop: "1px solid var(--rule)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: "1.2rem" }}>{formatInr(p.amount_paise)}</div>
                  <div style={{ fontSize: ".85rem" }}>
                    {p.profiles?.name || "Author"}
                    <span style={{ color: "var(--muted)" }}> · {p.profiles?.email}</span>
                  </div>
                  <div style={{ fontSize: ".82rem", color: "var(--muted)", marginTop: ".2rem" }}>
                    Pay to: {p.payout_destination}
                  </div>
                  <div style={{ fontSize: ".74rem", color: "var(--muted)" }}>
                    Requested {new Date(p.requested_at).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <PayoutActions payoutId={p.id} />
              </div>
            ))}
          </div>
        )}
        <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: "1rem" }}>
          Send the money yourself (UPI or bank transfer), then click &quot;Mark as paid&quot; and enter the transaction
          reference. The author sees it in their payout history.
        </p>
      </div>

      <div style={{ ...card, marginBottom: "1.4rem" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.05rem", marginBottom: "1rem" }}>
          Commission &amp; payout settings
        </h3>
        <SettingsForm {...settings} />
      </div>

      <div style={{ ...card, overflowX: "auto" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.05rem", marginBottom: "1rem" }}>
          Settled payouts
        </h3>
        {settled.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".88rem" }}>Nothing settled yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem", minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: ".72rem", letterSpacing: ".06em", textTransform: "uppercase" }}>
                <th style={{ padding: ".3rem .5rem .6rem 0" }}>Author</th>
                <th style={{ padding: ".3rem .5rem .6rem" }}>Amount</th>
                <th style={{ padding: ".3rem .5rem .6rem" }}>Status</th>
                <th style={{ padding: ".3rem .5rem .6rem" }}>Date</th>
                <th style={{ padding: ".3rem 0 .6rem .5rem" }}>Reference / reason</th>
              </tr>
            </thead>
            <tbody>
              {settled.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--rule)" }}>
                  <td style={{ padding: ".7rem .5rem .7rem 0" }}>{p.profiles?.name || "Author"}</td>
                  <td style={{ padding: ".7rem .5rem" }}>{formatInr(p.amount_paise)}</td>
                  <td style={{ padding: ".7rem .5rem", color: p.status === "paid" ? "var(--green, #2f7d4f)" : "var(--muted)" }}>
                    {p.status}
                  </td>
                  <td style={{ padding: ".7rem .5rem" }}>
                    {p.processed_at ? new Date(p.processed_at).toLocaleDateString("en-IN") : ""}
                  </td>
                  <td style={{ padding: ".7rem 0 .7rem .5rem", color: "var(--muted)" }}>
                    {p.status === "rejected" ? p.admin_note : p.reference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}