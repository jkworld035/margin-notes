import type { SupabaseClient } from "@supabase/supabase-js";

// ---------- formatting ----------

export function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function shortInr(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `₹${Math.round(rupees)}`;
}

// ---------- types ----------

export type MonthPoint = { key: string; label: string; earnings: number; platform: number };

export type BookStat = {
  id: string;
  title: string;
  status: string;
  priceInr: number;
  sales: number;
  gross: number;
  earnings: number;
};

export type SaleRow = { id: string; bookTitle: string; amount: number; earnings: number; paidAt: string };

export type PayoutRow = {
  id: string;
  amountPaise: number;
  status: string;
  method: string;
  destination: string;
  reference: string | null;
  adminNote: string | null;
  requestedAt: string;
  processedAt: string | null;
};

export type PayoutDetails = {
  method: "upi" | "bank";
  accountHolder: string;
  upiId: string;
  bankAccountNumber: string;
  ifsc: string;
};

export type AuthorBookStats = {
  publishedCount: number;
  draftCount: number;
  totalSales: number;
  gross: number;
  earnings: number;
  platformShare: number;
  available: number;
  clearing: number;
  inReview: number;
  paidOut: number;
  months: MonthPoint[];
  books: BookStat[];
  recentSales: SaleRow[];
  payouts: PayoutRow[];
  details: PayoutDetails | null;
  settings: { authorSharePercent: number; minPayoutInr: number; holdDays: number };
};

type PurchaseLike = {
  paid_at: string | null;
  author_amount_paise: number | null;
  platform_amount_paise: number | null;
};

// Last six months of sales, oldest first. Months with no sales are kept as zeros
// so the chart always has a steady shape.
export function monthSeries(purchases: PurchaseLike[], count = 6): MonthPoint[] {
  const now = new Date();
  const points: MonthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      earnings: 0,
      platform: 0,
    });
  }
  const byKey = new Map(points.map((p) => [p.key, p]));
  for (const p of purchases) {
    if (!p.paid_at) continue;
    const d = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point = byKey.get(key);
    if (point) {
      point.earnings += p.author_amount_paise ?? 0;
      point.platform += p.platform_amount_paise ?? 0;
    }
  }
  return points;
}

// ---------- the main query ----------

export async function getAuthorBookStats(supabase: SupabaseClient, userId: string): Promise<AuthorBookStats> {
  const [booksRes, settingsRes, payoutsRes, detailsRes] = await Promise.all([
    supabase.from("books").select("id, title, status, price_inr").eq("author_id", userId),
    supabase.from("platform_settings").select("author_share_percent, min_payout_inr, hold_days").eq("id", 1).maybeSingle(),
    supabase
      .from("author_payouts")
      .select("id, amount_paise, status, payout_method, payout_destination, reference, admin_note, requested_at, processed_at")
      .eq("author_id", userId)
      .order("requested_at", { ascending: false })
      .limit(50),
    supabase
      .from("author_payout_details")
      .select("method, account_holder, upi_id, bank_account_number, ifsc")
      .eq("author_id", userId)
      .maybeSingle(),
  ]);

  const settings = {
    authorSharePercent: settingsRes.data?.author_share_percent ?? 60,
    minPayoutInr: settingsRes.data?.min_payout_inr ?? 100,
    holdDays: settingsRes.data?.hold_days ?? 7,
  };

  const books: any[] = booksRes.data || [];
  const bookIds = books.map((b) => b.id);

  let purchases: any[] = [];
  if (bookIds.length > 0) {
    const { data } = await supabase
      .from("book_purchases")
      .select("id, book_id, amount_paise, author_amount_paise, platform_amount_paise, paid_at")
      .in("book_id", bookIds)
      .eq("status", "paid")
      .order("paid_at", { ascending: false });
    purchases = data || [];
  }

  const titleById = new Map<string, string>(books.map((b) => [b.id, b.title]));

  // per-book numbers
  const perBook = new Map<string, BookStat>(
    books.map((b) => [
      b.id,
      { id: b.id, title: b.title, status: b.status, priceInr: b.price_inr, sales: 0, gross: 0, earnings: 0 },
    ])
  );

  let gross = 0;
  let earnings = 0;
  let platformShare = 0;
  const cutoff = Date.now() - settings.holdDays * 24 * 60 * 60 * 1000;
  let eligible = 0;

  for (const p of purchases) {
    const authorAmount = p.author_amount_paise ?? 0;
    gross += p.amount_paise;
    earnings += authorAmount;
    platformShare += p.platform_amount_paise ?? 0;
    if (p.paid_at && new Date(p.paid_at).getTime() <= cutoff) eligible += authorAmount;

    const stat = perBook.get(p.book_id);
    if (stat) {
      stat.sales += 1;
      stat.gross += p.amount_paise;
      stat.earnings += authorAmount;
    }
  }

  const payouts: PayoutRow[] = (payoutsRes.data || []).map((r: any) => ({
    id: r.id,
    amountPaise: r.amount_paise,
    status: r.status,
    method: r.payout_method,
    destination: r.payout_destination,
    reference: r.reference,
    adminNote: r.admin_note,
    requestedAt: r.requested_at,
    processedAt: r.processed_at,
  }));

  const inReview = payouts.filter((p) => p.status === "requested").reduce((sum, p) => sum + p.amountPaise, 0);
  const paidOut = payouts.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amountPaise, 0);

  const d: any = detailsRes.data;
  const details: PayoutDetails | null = d
    ? {
        method: d.method,
        accountHolder: d.account_holder,
        upiId: d.upi_id || "",
        bankAccountNumber: d.bank_account_number || "",
        ifsc: d.ifsc || "",
      }
    : null;

  return {
    publishedCount: books.filter((b) => b.status === "published").length,
    draftCount: books.filter((b) => b.status === "draft").length,
    totalSales: purchases.length,
    gross,
    earnings,
    platformShare,
    available: Math.max(0, eligible - inReview - paidOut),
    clearing: Math.max(0, earnings - eligible),
    inReview,
    paidOut,
    months: monthSeries(purchases),
    books: Array.from(perBook.values()).sort((a, b) => b.earnings - a.earnings || b.sales - a.sales),
    recentSales: purchases.slice(0, 8).map((p) => ({
      id: p.id,
      bookTitle: titleById.get(p.book_id) || "Book",
      amount: p.amount_paise,
      earnings: p.author_amount_paise ?? 0,
      paidAt: p.paid_at,
    })),
    payouts,
    details,
    settings,
  };
}