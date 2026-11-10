"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitReview(bookId: string, rating: number, text: string) {
  if (!UUID.test(bookId)) return { error: "Invalid book." };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a rating from 1 to 5 stars." };
  }

  const review = String(text ?? "").trim();

  if (review.length > 1000) {
    return { error: "Reviews can be up to 1000 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in to review this book." };

  const { data: book } = await supabase
    .from("books")
    .select("author_id")
    .eq("id", bookId)
    .eq("status", "published")
    .maybeSingle();

  if (!book) return { error: "Book not found." };
  if (book.author_id === user.id) return { error: "You can't review your own book." };

  const { error } = await supabase.from("book_reviews").upsert(
    {
      book_id: bookId,
      user_id: user.id,
      rating,
      review,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "book_id,user_id" }
  );

  if (error) {
    console.error("[Reviews] save:", error.message);
    return { error: "Could not save your review." };
  }

  revalidatePath(`/books/${bookId}`);
  revalidatePath("/books");
  return { success: true };
}

export async function deleteReview(bookId: string) {
  if (!UUID.test(bookId)) return { error: "Invalid book." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in." };

  const { error } = await supabase
    .from("book_reviews")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", user.id);

  if (error) return { error: "Could not delete your review." };

  revalidatePath(`/books/${bookId}`);
  revalidatePath("/books");
  return { success: true };
}
