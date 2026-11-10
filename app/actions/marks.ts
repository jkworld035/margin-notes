"use server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MARKS_PER_BOOK = 200;

export async function addMark(
  bookId: string,
  kind: "bookmark" | "highlight",
  chapterNumber: number,
  fraction: number,
  quote?: string
) {
  if (!UUID.test(bookId)) return { error: "Invalid book." };
  if (kind !== "bookmark" && kind !== "highlight") return { error: "Invalid type." };

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || !Number.isFinite(fraction)) {
    return { error: "Invalid position." };
  }

  const text = String(quote ?? "").replace(/\s+/g, " ").trim().slice(0, 500);

  if (kind === "highlight" && !text) return { error: "Select some text first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in to save bookmarks and highlights." };

  const { count } = await supabase
    .from("reader_marks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("book_id", bookId);

  if ((count ?? 0) >= MAX_MARKS_PER_BOOK) {
    return { error: "You've reached the limit of saved marks for this book." };
  }

  const { data, error } = await supabase
    .from("reader_marks")
    .insert({
      user_id: user.id,
      book_id: bookId,
      kind,
      chapter_number: chapterNumber,
      chapter_fraction: Math.min(1, Math.max(0, fraction)),
      quote: kind === "highlight" ? text : null,
    })
    .select("id, kind, chapter_number, chapter_fraction, quote")
    .single();

  if (error || !data) {
    console.error("[Marks] add:", error?.message);
    return { error: "Could not save." };
  }

  return { mark: data };
}

export async function deleteMark(markId: string) {
  if (!UUID.test(markId)) return { error: "Invalid mark." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in." };

  const { error } = await supabase
    .from("reader_marks")
    .delete()
    .eq("id", markId)
    .eq("user_id", user.id);

  if (error) return { error: "Could not delete." };

  return { success: true };
}
