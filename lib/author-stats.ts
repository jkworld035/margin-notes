import type { SupabaseClient } from "@supabase/supabase-js";

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
  const symbol = "₹";
  if (rupees >= 100000) return `${symbol}${(rupees / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (rupees >= 1000) return `${symbol}${(rupees / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${symbol}${Math.round(rupees)}`;
}

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

type BookRecord = { id: string; title: string; status: string; price_inr: number };
type PurchaseRecord = PurchaseLike & {
  id: string;
  book_id: string;
  amount_paise: number;
};
type PayoutRecord = {
  id: string;
  amount_paise: number;
  status: string;
  payout_method: string;
  payout_destination: string;
  reference: string | null;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
};

export function monthSeries(purchases: PurchaseLike[], count = 6): MonthPoint[] {
  const now = new Date();
  const points: MonthPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    points.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      earnings: 0,
      platform: 0,
    });
  }
  const byKey = new Map(points.map((p) => [p.key, p]));
  for (const p of purchases) {
    if (!p.paid_at) continue;
    const date = new Date(p.paid_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const point = byKey.get(key);
    if (point) {
      point.earnings += p.author_amount_paise ?? 0;
      point.platform += p.platform_amount_paise ?? 0;
    }
  }
  return points;
}

const PAGE_SIZE = 500;

async function fetchAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  description: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Unable to load ${description}: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function getAuthorBookStats(
  supabase: SupabaseClient,
  userId: string
): Promise<AuthorBookStats> {
  // The supplied client must be authenticated as this author and protected by RLS.
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    throw new Error("You must be signed in as the requested author.");
  }

  const [books, settingsRes, payoutRecords, detailsRes] = await Promise.all([
    fetchAll<BookRecord>(
      (from, to) => supabase.from("books")
        .select("id, title, status, price_inr")
        .eq("author_id", userId)
        .order("id", { ascending: true })
        .range(from, to),
      "books"
    ),
    supabase.from("platform_settings")
      .select("author_share_percent, min_payout_inr, hold_days")
      .eq("id", 1)
      .maybeSingle(),
    fetchAll<PayoutRecord>(
      (from, to) => supabase.from("author_payouts")
        .select("id, amount_paise, status, payout_method, payout_destination, reference, admin_note, requested_at, processed_at")
        .eq("author_id", userId)
        .order("requested_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
      "payouts"
    ),
    supabase.from("author_payout_details")
      .select("method, account_holder, upi_id, bank_account_number, ifsc")
      .eq("author_id", userId)
      .maybeSingle(),
  ]);

  if (settingsRes.error) throw new Error(`Unable to load payout settings: ${settingsRes.error.message}`);
  if (detailsRes.error) throw new Error(`Unable to load payout details: ${detailsRes.error.message}`);
  if (!settingsRes.data) throw new Error("Platform payout settings are not available.");

  const settings = {
    authorSharePercent: settingsRes.data.author_share_percent,
    minPayoutInr: settingsRes.data.min_payout_inr,
    holdDays: settingsRes.data.hold_days,
  };

  const bookIds = books.map((book) => book.id);
  const purchases: PurchaseRecord[] = [];

  // Batch book IDs to avoid overly long URLs, and paginate every batch.
  const BOOK_BATCH_SIZE = 75;
  for (let start = 0; start < bookIds.length; start += BOOK_BATCH_SIZE) {
    const ids = bookIds.slice(start, start + BOOK_BATCH_SIZE);
    const batch = await fetchAll<PurchaseRecord>(
      (from, to) => supabase.from("book_purchases")
        .select("id, book_id, amount_paise, author_amount_paise, platform_amount_paise, paid_at")
        .in("book_id", ids)
        .eq("status", "paid")
        .order("id", { ascending: true })
        .range(from, to),
      "paid book purchases"
    );
    purchases.push(...batch);
  }

  const titleById = new Map(books.map((book) => [book.id, book.title]));
  const perBook = new Map<string, BookStat>(books.map((book) => [
    book.id,
    {
      id: book.id,
      title: book.title,
      status: book.status,
      priceInr: book.price_inr,
      sales: 0,
      gross: 0,
      earnings: 0,
    },
  ]));

  let gross = 0;
  let earnings = 0;
  let platformShare = 0;
  let eligible = 0;
  const cutoff = Date.now() - settings.holdDays * 24 * 60 * 60 * 1000;

  for (const purchase of purchases) {
    const authorAmount = purchase.author_amount_paise ?? 0;
    const platformAmount = purchase.platform_amount_paise ?? 0;
    gross += purchase.amount_paise;
    earnings += authorAmount;
    platformShare += platformAmount;

    if (purchase.paid_at && new Date(purchase.paid_at).getTime() <= cutoff) {
      eligible += authorAmount;
    }

    const stat = perBook.get(purchase.book_id);
    if (stat) {
      stat.sales += 1;
      stat.gross += purchase.amount_paise;
      stat.earnings += authorAmount;
    }
  }

  const allPayouts: PayoutRow[] = payoutRecords.map((row) => ({
    id: row.id,
    amountPaise: row.amount_paise,
    status: row.status,
    method: row.payout_method,
    destination: row.payout_destination,
    reference: row.reference,
    adminNote: row.admin_note,
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
  }));

  const inReview = allPayouts
    .filter((p) => p.status === "requested")
    .reduce((sum, p) => sum + p.amountPaise, 0);
  const paidOut = allPayouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const detail = detailsRes.data;
  const details: PayoutDetails | null = detail
    ? {
        method: detail.method as "upi" | "bank",
        accountHolder: detail.account_holder,
        upiId: detail.upi_id ?? "",
        bankAccountNumber: detail.bank_account_number ?? "",
        ifsc: detail.ifsc ?? "",
      }
    : null;

  purchases.sort((a, b) =>
    (b.paid_at ?? "").localeCompare(a.paid_at ?? "") || b.id.localeCompare(a.id)
  );

  return {
    publishedCount: books.filter((book) => book.status === "published").length,
    draftCount: books.filter((book) => book.status === "draft").length,
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
    recentSales: purchases.slice(0, 8).map((purchase) => ({
      id: purchase.id,
      bookTitle: titleById.get(purchase.book_id) ?? "Book",
      amount: purchase.amount_paise,
      earnings: purchase.author_amount_paise ?? 0,
      paidAt: purchase.paid_at ?? "",
    })),
    payouts: allPayouts.slice(0, 50),
    details,
    settings,
  };
}
