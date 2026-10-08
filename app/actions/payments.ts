"use server";

import crypto from "crypto";
import Razorpay from "razorpay";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderResult =
  | { orderId: string; amount: number; currency: string; keyId: string; bookTitle: string }
  | { error: string; status: number };

type VerifyResult = { success: true; bookId: string } | { error: string; status: number };

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, client: new Razorpay({ key_id: keyId, key_secret: keySecret }) };
}

// Step 1 — create a Razorpay order for a book.
// The amount is read from the database here on the server; the browser never
// supplies a price, so it can't be tampered with.
export async function createRazorpayOrder(bookId: string): Promise<OrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to buy this book.", status: 401 };

  const rz = getRazorpayConfig();
  if (!rz) return { error: "Payments aren't configured yet.", status: 500 };

  const { data: book } = await supabase
    .from("books")
    .select("id, title, price_inr, status, author_id")
    .eq("id", bookId)
    .single();

  if (!book || book.status !== "published") return { error: "Book not found.", status: 404 };
  if (book.author_id === user.id) return { error: "You can't buy your own book.", status: 400 };

  const amountPaise = Math.round((book.price_inr || 0) * 100);
  if (amountPaise < 100) return { error: "This book is free — no purchase needed.", status: 400 };

  const { data: alreadyOwned } = await supabase
    .from("book_purchases")
    .select("id")
    .eq("book_id", bookId)
    .eq("buyer_id", user.id)
    .eq("status", "paid")
    .maybeSingle();
  if (alreadyOwned) return { error: "You already own this book.", status: 400 };

  try {
    const receipt = `bk_${bookId.replace(/-/g, "").slice(0, 12)}_${Date.now().toString(36)}`;
    const order = await rz.client.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: { book_id: bookId, buyer_id: user.id },
    });

    const { error: insertError } = await supabase.from("book_purchases").insert({
      book_id: bookId,
      buyer_id: user.id,
      razorpay_order_id: order.id,
      amount_paise: amountPaise,
      currency: "INR",
      status: "created",
    });
    if (insertError) return { error: "Couldn't start checkout. Please try again.", status: 500 };

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: String(order.currency),
      keyId: rz.keyId,
      bookTitle: book.title,
    };
  } catch (e) {
    console.error("Razorpay order creation failed:", e);
    return { error: "Couldn't create the payment order. Please try again.", status: 500 };
  }
}

// Step 3 — verify the payment signature, then (and only then) mark it paid.
export async function verifyRazorpayPayment(input: {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}): Promise<VerifyResult> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return { error: "Missing payment details.", status: 400 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in.", status: 401 };

  const rz = getRazorpayConfig();
  if (!rz) return { error: "Payments aren't configured yet.", status: 500 };

  // Only the buyer who created this order can verify it.
  const { data: purchase } = await supabase
    .from("book_purchases")
    .select("id, book_id, status")
    .eq("razorpay_order_id", razorpay_order_id)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (!purchase) return { error: "Order not found.", status: 404 };

  // Already verified earlier (e.g. a duplicate callback) — nothing more to do.
  if (purchase.status === "paid") return { success: true, bookId: purchase.book_id };

  const expected = crypto
    .createHmac("sha256", rz.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) return { error: "Payment verification failed.", status: 400 };

  try {
    // No RLS update policy exists for users on purpose — only this trusted
    // server path, after a valid signature, can mark a purchase as paid.
    const admin = createAdminClient();
    const { error } = await admin
      .from("book_purchases")
      .update({
        status: "paid",
        razorpay_payment_id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", purchase.id)
      .in("status", ["created", "failed"]);

    if (error) {
      console.error("Failed to record paid purchase:", error);
      return { error: "Payment received but we couldn't unlock the book. Contact support.", status: 500 };
    }
  } catch (e) {
    console.error("Admin client error while recording purchase:", e);
    return { error: "Payment received but we couldn't unlock the book. Contact support.", status: 500 };
  }

  revalidatePath(`/books/${purchase.book_id}`);
  revalidatePath("/books");
  return { success: true, bookId: purchase.book_id };
}
