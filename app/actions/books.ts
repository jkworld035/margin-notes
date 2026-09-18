"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBook(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") || "").trim();

  if (!title) return { error: "Give your book a title." };

  const { data: inserted, error } = await supabase
    .from("books")
    .insert({
      author_id: user.id,
      title,
      description,
      cover_image_url: coverImageUrl || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/books");
  revalidatePath("/profile");
  redirect(`/books/${inserted.id}/edit`);
}

export async function updateBook(bookId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") || "").trim();

  if (!title) return { error: "Give your book a title." };

  const { error } = await supabase
    .from("books")
    .update({
      title,
      description,
      cover_image_url: coverImageUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/edit`);
  revalidatePath("/books");
  return { success: true };
}

export async function setBookStatus(bookId: string, status: "draft" | "published") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("books")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/edit`);
  revalidatePath("/books");
  return { success: true };
}

export async function deleteBook(bookId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (error) return { error: error.message };
  revalidatePath("/books");
  revalidatePath("/profile");
  redirect("/books");
}

export async function addChapter(bookId: string, title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const trimmed = title.trim();
  if (!trimmed) return { error: "Give the chapter a title." };

  const { data: existing } = await supabase
    .from("book_chapters")
    .select("chapter_number")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: false })
    .limit(1);

  const nextNumber = (existing?.[0]?.chapter_number || 0) + 1;

  const { data: inserted, error } = await supabase
    .from("book_chapters")
    .insert({ book_id: bookId, title: trimmed, chapter_number: nextNumber })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/books/${bookId}/edit`);
  return { success: true, chapterId: inserted.id };
}

export async function updateChapter(chapterId: string, bookId: string, title: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { error: "Chapter needs a title." };

  const { error } = await supabase
    .from("book_chapters")
    .update({ title: trimmedTitle, content, updated_at: new Date().toISOString() })
    .eq("id", chapterId);

  if (error) return { error: error.message };

  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/edit`);
  return { success: true };
}

export async function deleteChapter(chapterId: string, bookId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("book_chapters").delete().eq("id", chapterId);
  if (error) return { error: error.message };
  revalidatePath(`/books/${bookId}/edit`);
  revalidatePath(`/books/${bookId}`);
  return { success: true };
}
