"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { success: true } | { error: string };

const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? user : null;
}

// ---------- Author: where to send the money ----------

export async function savePayoutDetails(input: {
  method: "upi" | "bank";
  accountHolder: string;
  upiId?: string;
  bankAccountNumber?: string;
  ifsc?: string;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  const accountHolder = input.accountHolder.trim();
  if (accountHolder.length < 2) return { error: "Enter the account holder's name." };

  let row: Record<string, unknown>;

  if (input.method === "upi") {
    const upiId = (input.upiId || "").trim();
    if (!UPI_RE.test(upiId)) return { error: "Enter a valid UPI ID, like name@bank." };
    row = { method: "upi", upi_id: upiId, bank_account_number: null, ifsc: null };
  } else {
    const account = (input.bankAccountNumber || "").replace(/\s/g, "");
    const ifsc = (input.ifsc || "").trim().toUpperCase();
    if (!ACCOUNT_RE.test(account)) return { error: "Account number should be 9 to 18 digits." };
    if (!IFSC_RE.test(ifsc)) return { error: "Enter a valid IFSC code, like HDFC0001234." };
    row = { method: "bank", upi_id: null, bank_account_number: account, ifsc };
  }

  const { error } = await supabase.from("author_payout_details").upsert({
    author_id: user.id,
    account_holder: accountHolder,
    updated_at: new Date().toISOString(),
    ...row,
  });
  if (error) return { error: "Couldn't save your payout details. Please try again." };

  revalidatePath("/dashboard");
  return { success: true };
}

// ---------- Author: ask to be paid ----------

export async function requestPayout(amountInr: number): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in." };

  if (!Number.isInteger(amountInr) || amountInr < 1) {
    return { error: "Enter a whole number of rupees." };
  }

  try {
    // The balance check happens inside the database function, atomically.
    const admin = createAdminClient();
    const { error } = await admin.rpc("request_author_payout", {
      p_author_id: user.id,
      p_amount_paise: amountInr * 100,
    });

    if (error) {
      const message = error.message || "";
      if (message.includes("no_payout_details")) return { error: "Add your payout details first." };
      if (message.includes("below_minimum")) return { error: "That's below the minimum payout amount." };
      if (message.includes("insufficient_balance")) return { error: "That's more than your available balance." };
      return { error: "Couldn't create the payout request. Please try again." };
    }
  } catch {
    return { error: "Payouts aren't configured yet." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin/payouts");
  return { success: true };
}

// ---------- Admin: settle requests ----------

export async function markPayoutPaid(payoutId: string, reference: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };

  const ref = reference.trim();
  if (ref.length < 4) return { error: "Enter the transaction or UTR reference." };

  const db = createAdminClient();
  const { data, error } = await db
    .from("author_payouts")
    .update({
      status: "paid",
      reference: ref,
      processed_at: new Date().toISOString(),
      processed_by: admin.id,
    })
    .eq("id", payoutId)
    .eq("status", "requested")
    .select("id");

  if (error) return { error: "Couldn't update the payout." };
  if (!data || data.length === 0) return { error: "This request was already handled." };

  revalidatePath("/admin/payouts");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectPayout(payoutId: string, note: string): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };

  const reason = note.trim();
  if (reason.length < 3) return { error: "Add a short reason for the author." };

  const db = createAdminClient();
  const { data, error } = await db
    .from("author_payouts")
    .update({
      status: "rejected",
      admin_note: reason,
      processed_at: new Date().toISOString(),
      processed_by: admin.id,
    })
    .eq("id", payoutId)
    .eq("status", "requested")
    .select("id");

  if (error) return { error: "Couldn't update the payout." };
  if (!data || data.length === 0) return { error: "This request was already handled." };

  revalidatePath("/admin/payouts");
  revalidatePath("/dashboard");
  return { success: true };
}

// ---------- Admin: commission settings ----------

export async function updatePlatformSettings(input: {
  authorSharePercent: number;
  minPayoutInr: number;
  holdDays: number;
}): Promise<Result> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Admins only." };

  const { authorSharePercent, minPayoutInr, holdDays } = input;
  if (!Number.isInteger(authorSharePercent) || authorSharePercent < 0 || authorSharePercent > 100) {
    return { error: "Author share must be a whole number from 0 to 100." };
  }
  if (!Number.isInteger(minPayoutInr) || minPayoutInr < 1) {
    return { error: "Minimum payout must be at least ₹1." };
  }
  if (!Number.isInteger(holdDays) || holdDays < 0 || holdDays > 90) {
    return { error: "Hold period must be between 0 and 90 days." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("platform_settings")
    .update({
      author_share_percent: authorSharePercent,
      min_payout_inr: minPayoutInr,
      hold_days: holdDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { error: "Couldn't save the settings." };

  revalidatePath("/admin/payouts");
  revalidatePath("/dashboard");
  return { success: true };
}