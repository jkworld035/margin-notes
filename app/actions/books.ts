
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBookTemplate, chapterStarter } from "@/app/books/book-templates";

const MAX_BOOK_TITLE = 150;
const MAX_DESCRIPTION = 600;
const MAX_CHAPTER_TITLE = 150;
const MAX_CHAPTER_CONTENT = 50000;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function parsePrice(
  raw: FormDataEntryValue | null
): { price: number } | { error: string } {
  const value = String(raw ?? "0").trim();

  if (!value) return { price: 0 };

  const price = Number(value);

  if (!Number.isSafeInteger(price)) {
    return { error: "Price must be a whole number of rupees." };
  }

  if (price < 0 || price > 100000) {
    return { error: "Price must be between ₹0 and ₹1,00,000." };
  }

  return { price };
}

function parseBookDetails(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const coverImageUrl = String(formData.get("coverImageUrl") ?? "").trim();
  const priceResult = parsePrice(formData.get("price"));

  if (!title) return { error: "Give your book a title." };

  if (title.length > MAX_BOOK_TITLE) {
    return { error: "Book title is too long." };
  }

  if (description.length > MAX_DESCRIPTION) {
    return { error: "Description must be 600 characters or fewer." };
  }

  if ("error" in priceResult) {
    return { error: priceResult.error };
  }

  if (coverImageUrl.length > 2048) {
    return { error: "Cover image URL is too long." };
  }

  if (coverImageUrl) {
    try {
      const url = new URL(coverImageUrl);

      if (!["https:", "http:"].includes(url.protocol)) {
        return { error: "Invalid cover image URL." };
      }
    } catch {
      return { error: "Invalid cover image URL." };
    }
  }

  return {
    data: {
      title,
      description,
      cover_image_url: coverImageUrl || null,
      price_inr: priceResult.price,
    },
  };
}

async function getAuthenticatedUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("[Books] Authentication error:", error.message);
  }

  return user;
}

async function verifyBookOwner(
  supabase: SupabaseClient,
  bookId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("author_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[Books] Ownership check failed:", error.message);
    return false;
  }

  return Boolean(data);
}

function refreshBookPages(bookId: string) {
  revalidatePath(`/books/${bookId}`);
  revalidatePath(`/books/${bookId}/edit`);
  revalidatePath("/books");
  revalidatePath("/profile");
}

function logDatabaseError(operation: string, error: {
  code?: string;
  message: string;
  details?: string | null;
}) {
  console.error(`[Books] ${operation}:`, {
    code: error.code,
    message: error.message,
    details: error.details,
  });
}

// CREATE BOOK
export async function createBook(formData: FormData) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) {
    return { error: "You must be signed in." };
  }

  const parsed = parseBookDetails(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const templateId = String(formData.get("templateId") ?? "");
  const template = templateId ? getBookTemplate(templateId) : undefined;

  if (templateId && !template) {
    return { error: "The selected book template is invalid." };
  }

  const { data: inserted, error } = await supabase
    .from("books")
    .insert({
      ...parsed.data,
      author_id: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    if (error) logDatabaseError("Create book", error);

    return {
      error: error?.message ?? "Unable to create book.",
    };
  }

  if (template && template.chapters.length > 0) {
    const { error: chapterError } = await supabase
      .from("book_chapters")
      .insert(
        template.chapters.map((chapter, index) => ({
          book_id: inserted.id,
          title: chapter.title,
          content: chapterStarter(chapter.prompt),
          chapter_number: index + 1,
        }))
      );

    if (chapterError) {
      logDatabaseError("Create template chapters", chapterError);

      // The book was created successfully, but its template
      // chapters were not. Preserve the book and let the
      // author recover from the editor.
    }
  }

  refreshBookPages(inserted.id);

  redirect(`/books/${inserted.id}/edit`);
}

// UPDATE BOOK
export async function updateBook(
  bookId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) return { error: "You must be signed in." };

  const isOwner = await verifyBookOwner(supabase, bookId, user.id);

  if (!isOwner) {
    return { error: "Book not found or access denied." };
  }

  const parsed = parseBookDetails(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const { data, error } = await supabase
    .from("books")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookId)
    .eq("author_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    logDatabaseError("Update book", error);
    return { error: error.message };
  }

  if (!data) {
    return { error: "Book could not be updated." };
  }

  refreshBookPages(bookId);

  return { success: true };
}

// PUBLISH OR UNPUBLISH
export async function setBookStatus(
  bookId: string,
  status: "draft" | "published"
) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) return { error: "You must be signed in." };

  if (status !== "draft" && status !== "published") {
    return { error: "Invalid book status." };
  }

  if (!(await verifyBookOwner(supabase, bookId, user.id))) {
    return { error: "Book not found or access denied." };
  }

  if (status === "published") {
    const { data: chapters, error: chapterError } = await supabase
      .from("book_chapters")
      .select("id")
      .eq("book_id", bookId)
      .limit(1);

    if (chapterError) {
      logDatabaseError("Check chapters", chapterError);
      return { error: chapterError.message };
    }

    if (!chapters?.length) {
      return { error: "Add at least one chapter before publishing." };
    }
  }

  const { data, error } = await supabase
    .from("books")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookId)
    .eq("author_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    logDatabaseError("Change book status", error);
    return { error: error.message };
  }

  if (!data) return { error: "Book could not be updated." };

  refreshBookPages(bookId);

  return { success: true };
}

// DELETE BOOK
export async function deleteBook(bookId: string) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) return { error: "You must be signed in." };

  if (!(await verifyBookOwner(supabase, bookId, user.id))) {
    return { error: "Book not found or access denied." };
  }

  // Deleting a book with chapters or purchases may be
  // blocked by foreign-key constraints. Do not bypass them.
  const { data, error } = await supabase
    .from("books")
    .delete()
    .eq("id", bookId)
    .eq("author_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    logDatabaseError("Delete book", error);

    return {
      error: "Unable to delete this book. It may have chapters or purchases linked to it.",
    };
  }

  if (!data) return { error: "Book not found or access denied." };

  refreshBookPages(bookId);

  redirect("/books");
}

// ADD CHAPTER
export async function addChapter(bookId: string, title: string) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) return { error: "You must be signed in." };

  if (!(await verifyBookOwner(supabase, bookId, user.id))) {
    return { error: "Book not found or access denied." };
  }

  const trimmed = title.trim();

  if (!trimmed) return { error: "Give the chapter a title." };

  if (trimmed.length > MAX_CHAPTER_TITLE) {
    return { error: "Chapter title is too long." };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("book_chapters")
    .select("chapter_number")
    .eq("book_id", bookId)
    .order("chapter_number", { ascending: false })
    .limit(1);

  if (lookupError) {
    logDatabaseError("Find latest chapter", lookupError);
    return { error: lookupError.message };
  }

  const nextNumber = (existing?.[0]?.chapter_number ?? 0) + 1;

  const { data: inserted, error } = await supabase
    .from("book_chapters")
    .insert({
      book_id: bookId,
      title: trimmed,
      chapter_number: nextNumber,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    if (error) logDatabaseError("Add chapter", error);

    return {
      error: error?.message ?? "Unable to add chapter.",
    };
  }

  refreshBookPages(bookId);

  return { success: true, chapterId: inserted.id };
}

// UPDATE CHAPTER
export async function updateChapter(
  chapterId: string,
  bookId: string,
  title: string,
  content: string
) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) return { error: "You must be signed in." };

  if (!(await verifyBookOwner(supabase, bookId, user.id))) {
    return { error: "Book not found or access denied." };
  }

  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return { error: "Chapter needs a title." };
  }

  if (trimmedTitle.length > MAX_CHAPTER_TITLE) {
    return { error: "Chapter title is too long." };
  }

  if (content.length > MAX_CHAPTER_CONTENT) {
    return { error: "Chapter content exceeds 50,000 characters." };
  }

  const { data, error } = await supabase
    .from("book_chapters")
    .update({
      title: trimmedTitle,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .select("id")
    .maybeSingle();

  if (error) {
    logDatabaseError("Update chapter", error);
    return { error: error.message };
  }

  if (!data) {
    return { error: "Chapter not found or access denied." };
  }

  refreshBookPages(bookId);

  return { success: true };
}

// DELETE CHAPTER
export async function deleteChapter(
  chapterId: string,
  bookId: string
) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user) return { error: "You must be signed in." };

  if (!(await verifyBookOwner(supabase, bookId, user.id))) {
    return { error: "Book not found or access denied." };
  }

  const { data, error } = await supabase
    .from("book_chapters")
    .delete()
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .select("id")
    .maybeSingle();

  if (error) {
    logDatabaseError("Delete chapter", error);
    return { error: error.message };
  }

  if (!data) {
    return { error: "Chapter not found or access denied." };
  }

  refreshBookPages(bookId);

  return { success: true };
}
