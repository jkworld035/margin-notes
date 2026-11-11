"use server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Best-effort: a failed view must never break reading.
export async function logBookView(bookId: string) {
  if (!UUID.test(bookId)) return;
  try {
    const supabase = await createClient();
    await supabase.from("book_views").insert({ book_id: bookId });
  } catch {
    // ignore
  }
}

export async function toggleBookLike(bookId: string) {
  if (!UUID.test(bookId)) return { error: "Invalid book." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to like this book." };

  const { data: existing } = await supabase
    .from("book_likes")
    .select("book_id")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("book_likes").delete().eq("book_id", bookId).eq("user_id", user.id);
    if (error) return { error: "Could not update your like." };
    return { liked: false };
  }

  const { error } = await supabase.from("book_likes").insert({ book_id: bookId, user_id: user.id });
  if (error) return { error: "You can't like this book." };
  return { liked: true };
}

export async function clapBook(bookId: string, amount: number) {
  if (!UUID.test(bookId)) return { error: "Invalid book." };
  if (!Number.isInteger(amount) || amount < 1 || amount > 50) return { error: "Invalid clap amount." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to clap for this book." };

  const { data, error } = await supabase.rpc("clap_book", { p_book_id: bookId, p_amount: amount });
  if (error) return { error: "You can't clap for this book." };
  return { myClaps: Number(data) };
}
