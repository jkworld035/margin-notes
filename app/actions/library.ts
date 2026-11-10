"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Called (debounced) by the reader whenever the reader turns a page.
export async function saveReadingProgress(
  bookId: string,
  chapterNumber: number,
  fraction: number,
  percent: number,
  completed: boolean
) {
  if (!UUID.test(bookId)) return { error: "Invalid book." };

  if (
    !Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    !Number.isFinite(fraction) ||
    !Number.isFinite(percent)
  ) {
    return { error: "Invalid progress." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  // Once finished, a book stays "completed" even if it is re-read.
  const { data: existing } = await supabase
    .from("reading_progress")
    .select("completed")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: user.id,
      book_id: bookId,
      chapter_number: chapterNumber,
      chapter_fraction: Math.min(1, Math.max(0, fraction)),
      percent: Math.min(100, Math.max(0, Math.round(percent))),
      completed: Boolean(completed || existing?.completed),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" }
  );

  if (error) {
    console.error("[Library] save progress:", error.message);
    return { error: "Could not save progress." };
  }

  return { success: true };
}

// Save or remove a book from the reader's library.
export async function toggleLibraryBook(bookId: string) {
  if (!UUID.test(bookId)) return { error: "Invalid book." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in to save books." };

  const { data: existing } = await supabase
    .from("library_books")
    .select("book_id")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("library_books")
      .delete()
      .eq("user_id", user.id)
      .eq("book_id", bookId);

    if (error) return { error: "Could not update your library." };

    revalidatePath("/library");
    return { saved: false };
  }

  const { error } = await supabase
    .from("library_books")
    .insert({ user_id: user.id, book_id: bookId });

  if (error) return { error: "Could not update your library." };

  revalidatePath("/library");
  return { saved: true };
}
