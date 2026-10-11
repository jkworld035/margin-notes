"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markPayoutPaid, rejectPayout, updatePlatformSettings } from "@/app/actions/payouts";

export function PayoutActions({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePaid() {
    const reference = window.prompt("Enter the transaction / UTR reference for this payment:");
    if (!reference) return;
    setPending(true);
    setError(null);
    const res = await markPayoutPaid(payoutId, reference);
    setPending(false);
    if ("error" in res) return setError(res.error);
    router.refresh();
  }

  async function handleReject() {
    const note = window.prompt("Why is this being rejected? The author will see this:");
    if (!note) return;
    setPending(true);
    setError(null);
    const res = await rejectPayout(payoutId, note);
    setPending(false);
    if ("error" in res) return setError(res.error);
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: ".4rem" }}>
        <button className="btn btn-primary btn-sm" type="button" disabled={pending} onClick={handlePaid}>
          Mark as paid
        </button>
        <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={handleReject}>
          Reject
        </button>
      </div>
      {error && <div style={{ color: "#b3321f", fontSize: ".78rem", marginTop: ".4rem" }}>{error}</div>}
    </div>
  );
}

export function SettingsForm({
  authorSharePercent,
  minPayoutInr,
  holdDays,
}: {
  authorSharePercent: number;
  minPayoutInr: number;
  holdDays: number;
}) {
  const router = useRouter();
  const [share, setShare] = useState(String(authorSharePercent));
  const [min, setMin] = useState(String(minPayoutInr));
  const [hold, setHold] = useState(String(holdDays));
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const res = await updatePlatformSettings({
      authorSharePercent: parseInt(share, 10),
      minPayoutInr: parseInt(min, 10),
      holdDays: parseInt(hold, 10),
    });
    setPending(false);
    if ("error" in res) return setMsg({ type: "error", text: res.error });
    setMsg({ type: "ok", text: "Saved. Applies to new sales only." });
    router.refresh();
  }

  const sharePct = parseInt(share, 10);

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
        <div className="form-group">
          <label>Author share (%)</label>
          <input type="number" min={0} max={100} step={1} value={share} onChange={(e) => setShare(e.target.value)} />
          <div className="form-hint">
            {Number.isFinite(sharePct) ? `Platform keeps ${100 - sharePct}%` : ""}
          </div>
        </div>
        <div className="form-group">
          <label>Minimum payout (₹)</label>
          <input type="number" min={1} step={1} value={min} onChange={(e) => setMin(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Hold period (days)</label>
          <input type="number" min={0} max={90} step={1} value={hold} onChange={(e) => setHold(e.target.value)} />
          <div className="form-hint">Time before a sale can be withdrawn.</div>
        </div>
      </div>
      <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
      {msg && (
        <span style={{ marginLeft: ".8rem", fontSize: ".83rem", color: msg.type === "error" ? "#b3321f" : "var(--green, #2f7d4f)" }}>
          {msg.text}
        </span>
      )}
    </form>
  );
}