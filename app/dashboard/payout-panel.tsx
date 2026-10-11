"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePayoutDetails, requestPayout } from "@/app/actions/payouts";
import { formatInr, type PayoutDetails, type PayoutRow } from "@/lib/author-stats";

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--rule)",
  padding: "1.4rem",
};

const statusColor: Record<string, string> = {
  requested: "var(--accent)",
  paid: "var(--green, #2f7d4f)",
  rejected: "var(--muted)",
};

const statusText: Record<string, string> = {
  requested: "In review",
  paid: "Paid",
  rejected: "Rejected",
};

function maskDestination(destination: string): string {
  // Shows "Name | A/C XXXXXX1234 | IFSC ..." instead of the full account number.
  return destination.replace(/A\/C (\d+)/, (_, digits: string) => `A/C ${"X".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`);
}

export default function PayoutPanel({
  available,
  clearing,
  inReview,
  paidOut,
  settings,
  details,
  payouts,
}: {
  available: number;
  clearing: number;
  inReview: number;
  paidOut: number;
  settings: { authorSharePercent: number; minPayoutInr: number; holdDays: number };
  details: PayoutDetails | null;
  payouts: PayoutRow[];
}) {
  const router = useRouter();

  // payout details form
  const [editing, setEditing] = useState(!details);
  const [method, setMethod] = useState<"upi" | "bank">(details?.method || "upi");
  const [holder, setHolder] = useState(details?.accountHolder || "");
  const [upiId, setUpiId] = useState(details?.upiId || "");
  const [account, setAccount] = useState(details?.bankAccountNumber || "");
  const [ifsc, setIfsc] = useState(details?.ifsc || "");
  const [detailsMsg, setDetailsMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);

  // withdraw form
  const availableRupees = Math.floor(available / 100);
  const [amount, setAmount] = useState(availableRupees >= settings.minPayoutInr ? String(availableRupees) : "");
  const [withdrawMsg, setWithdrawMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [requesting, setRequesting] = useState(false);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsMsg(null);
    const res = await savePayoutDetails({
      method,
      accountHolder: holder,
      upiId,
      bankAccountNumber: account,
      ifsc,
    });
    setSavingDetails(false);
    if ("error" in res) {
      setDetailsMsg({ type: "error", text: res.error });
      return;
    }
    setDetailsMsg({ type: "ok", text: "Payout details saved." });
    setEditing(false);
    router.refresh();
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true);
    setWithdrawMsg(null);
    const res = await requestPayout(parseInt(amount, 10));
    setRequesting(false);
    if ("error" in res) {
      setWithdrawMsg({ type: "error", text: res.error });
      return;
    }
    setWithdrawMsg({ type: "ok", text: "Payout requested. We'll review it and send the money to your account." });
    setAmount("");
    router.refresh();
  }

  const canWithdraw = !!details && availableRupees >= settings.minPayoutInr;

  const message = (m: { type: "error" | "ok"; text: string } | null) =>
    m && (
      <div
        style={{
          marginTop: ".7rem",
          fontSize: ".83rem",
          color: m.type === "error" ? "#b3321f" : "var(--green, #2f7d4f)",
        }}
      >
        {m.text}
      </div>
    );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
      {/* Withdraw */}
      <div style={card}>
        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.05rem", marginBottom: ".4rem" }}>
          Get paid
        </h3>
        <div style={{ fontFamily: "var(--serif)", fontSize: "2rem", color: "var(--green, #2f7d4f)", lineHeight: 1.2 }}>
          {formatInr(available)}
        </div>
        <p style={{ color: "var(--muted)", fontSize: ".8rem", margin: ".2rem 0 1rem" }}>
          available to withdraw · minimum {formatInr(settings.minPayoutInr * 100)} · new sales clear after{" "}
          {settings.holdDays} days
        </p>

        {!details ? (
          <p style={{ fontSize: ".85rem", color: "var(--muted)" }}>Add your payout details first, then you can withdraw.</p>
        ) : (
          <form onSubmit={handleRequest} style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 140px" }}>
              <span style={{ position: "absolute", left: ".8rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>₹</span>
              <input
                type="number"
                min={settings.minPayoutInr}
                max={availableRupees}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                disabled={!canWithdraw}
                style={{ width: "100%", paddingLeft: "1.8rem" }}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!canWithdraw || requesting || !amount}>
              {requesting ? "Requesting…" : "Request payout"}
            </button>
          </form>
        )}
        {message(withdrawMsg)}

        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1.2rem", fontSize: ".78rem", color: "var(--muted)", flexWrap: "wrap" }}>
          <span>Clearing: {formatInr(clearing)}</span>
          <span>In review: {formatInr(inReview)}</span>
          <span>Paid out: {formatInr(paidOut)}</span>
        </div>
      </div>

      {/* Payout details */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.05rem", marginBottom: ".8rem" }}>
            Payout details
          </h3>
          {details && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: ".8rem" }}
            >
              Edit
            </button>
          )}
        </div>

        {details && !editing ? (
          <div style={{ fontSize: ".88rem", lineHeight: 1.8 }}>
            <div>{details.accountHolder}</div>
            {details.method === "upi" ? (
              <div style={{ color: "var(--muted)" }}>UPI · {details.upiId}</div>
            ) : (
              <div style={{ color: "var(--muted)" }}>
                Bank · {"X".repeat(Math.max(0, details.bankAccountNumber.length - 4))}
                {details.bankAccountNumber.slice(-4)} · {details.ifsc}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveDetails}>
            <div style={{ display: "flex", gap: ".5rem", marginBottom: ".8rem" }}>
              {(["upi", "bank"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={method === m ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                >
                  {m === "upi" ? "UPI" : "Bank account"}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label>Account holder name</label>
              <input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={80} required />
            </div>

            {method === "upi" ? (
              <div className="form-group">
                <label>UPI ID</label>
                <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="name@bank" maxLength={80} required />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Account number</label>
                  <input value={account} onChange={(e) => setAccount(e.target.value)} inputMode="numeric" maxLength={20} required />
                </div>
                <div className="form-group">
                  <label>IFSC code</label>
                  <input value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} placeholder="HDFC0001234" maxLength={11} required />
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: ".5rem" }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={savingDetails}>
                {savingDetails ? "Saving…" : "Save details"}
              </button>
              {details && (
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
        {message(detailsMsg)}
        <p style={{ color: "var(--muted)", fontSize: ".74rem", marginTop: ".9rem" }}>
          Only you and Margin Notes admins can see these details.
        </p>
      </div>

      {/* History */}
      <div style={{ ...card, gridColumn: "1 / -1", overflowX: "auto" }}>
        <h3 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "1.05rem", marginBottom: "1rem" }}>
          Payout history
        </h3>
        {payouts.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No payouts yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".85rem", minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: ".72rem", letterSpacing: ".06em", textTransform: "uppercase" }}>
                <th style={{ padding: ".3rem .5rem .6rem 0" }}>Requested</th>
                <th style={{ padding: ".3rem .5rem .6rem" }}>Amount</th>
                <th style={{ padding: ".3rem .5rem .6rem" }}>Status</th>
                <th style={{ padding: ".3rem .5rem .6rem" }}>Sent to</th>
                <th style={{ padding: ".3rem 0 .6rem .5rem" }}>Reference</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--rule)" }}>
                  <td style={{ padding: ".7rem .5rem .7rem 0" }}>{new Date(p.requestedAt).toLocaleDateString("en-IN")}</td>
                  <td style={{ padding: ".7rem .5rem" }}>{formatInr(p.amountPaise)}</td>
                  <td style={{ padding: ".7rem .5rem", color: statusColor[p.status] }}>{statusText[p.status] || p.status}</td>
                  <td style={{ padding: ".7rem .5rem", color: "var(--muted)" }}>{maskDestination(p.destination)}</td>
                  <td style={{ padding: ".7rem 0 .7rem .5rem", color: "var(--muted)" }}>
                    {p.status === "rejected" ? p.adminNote : p.reference || "—"}
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