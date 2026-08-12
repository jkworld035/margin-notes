"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const READ_WPM = 200;

function estimateReadTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / READ_WPM))} min`;
}

export async function submitPost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to write a post." };

  const title = String(formData.get("title") || "").trim();
  const subtitle = String(formData.get("subtitle") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const category = String(formData.get("category") || "Essays");
  const coverImageUrl = String(formData.get("coverImageUrl") || "").trim();
  const tagsRaw = String(formData.get("tags") || "");
  const mode = String(formData.get("mode") || "publish"); // "publish" | "draft" | "schedule"
  const scheduledAtRaw = String(formData.get("scheduledAt") || "").trim();
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  if (!title || !excerpt || !content) {
    return { error: "Title, excerpt, and content are all required." };
  }

  let status: "approved" | "draft" = "approved";
  let scheduledAt: string | null = null;

  if (mode === "draft") {
    status = "draft";
  } else if (mode === "schedule") {
    if (!scheduledAtRaw) return { error: "Pick a date and time to schedule for." };
    const when = new Date(scheduledAtRaw);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return { error: "Scheduled time must be in the future." };
    }
    status = "approved";
    scheduledAt = when.toISOString();
  }

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      title,
      subtitle: subtitle || null,
      excerpt,
      content,
      category,
      tags,
      author_id: user.id,
      status,
      scheduled_at: scheduledAt,
      cover_image_url: coverImageUrl || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/");
  if (status === "draft") {
    redirect("/profile?tab=drafts");
  }
  redirect(`/post/${inserted.id}`);
}

export async function updatePost(postId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const title = String(formData.get("title") || "").trim();
  const subtitle = String(formData.get("subtitle") || "").trim();
  const excerpt = String(formData.get("excerpt") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const category = String(formData.get("category") || "Essays");
  const coverImageUrl = String(formData.get("coverImageUrl") || "").trim();
  const tagsRaw = String(formData.get("tags") || "");
  const mode = String(formData.get("mode") || ""); // "publish" | "draft" | "schedule" | "" (no status change)
  const scheduledAtRaw = String(formData.get("scheduledAt") || "").trim();
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  if (!title || !excerpt || !content) {
    return { error: "Title, excerpt, and content are all required." };
  }

  const update: Record<string, unknown> = {
    title,
    subtitle: subtitle || null,
    excerpt,
    content,
    category,
    tags,
    cover_image_url: coverImageUrl || null,
  };

  if (mode === "draft") {
    update.status = "draft";
    update.scheduled_at = null;
  } else if (mode === "publish") {
    update.status = "approved";
    update.scheduled_at = null;
  } else if (mode === "schedule") {
    if (!scheduledAtRaw) return { error: "Pick a date and time to schedule for." };
    const when = new Date(scheduledAtRaw);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return { error: "Scheduled time must be in the future." };
    }
    update.status = "approved";
    update.scheduled_at = when.toISOString();
  }

  const { error } = await supabase.from("posts").update(update).eq("id", postId).eq("author_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/post/${postId}`);
  revalidatePath("/profile");
  revalidatePath("/");
  if (update.status === "draft") {
    redirect("/profile?tab=drafts");
  }
  redirect(`/post/${postId}`);
}

export async function setPostStatus(postId: string, status: "approved" | "rejected") {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ status }).eq("id", postId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/post/${postId}`);
  revalidatePath("/profile");
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/profile");
  revalidatePath("/");
}

export async function addCoAuthor(postId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: post } = await supabase.from("posts").select("author_id, co_author_ids").eq("id", postId).single();
  if (!post) return { error: "Story not found." };
  if (post.author_id !== user.id) return { error: "Only the primary author can add collaborators." };

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) return { error: "Enter an email address." };

  const { data: collaborator } = await supabase
    .from("profiles")
    .select("id, name")
    .ilike("email", trimmedEmail)
    .maybeSingle();

  if (!collaborator) return { error: "No user found with that email." };
  if (collaborator.id === user.id) return { error: "You're already the author." };
  if ((post.co_author_ids || []).includes(collaborator.id)) {
    return { error: `${collaborator.name} is already a collaborator.` };
  }

  const nextCoAuthors = [...(post.co_author_ids || []), collaborator.id];
  const { error } = await supabase.from("posts").update({ co_author_ids: nextCoAuthors }).eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath(`/write/${postId}`);
  revalidatePath(`/post/${postId}`);
  return { success: true, name: collaborator.name };
}

export async function removeCoAuthor(postId: string, coAuthorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: post } = await supabase.from("posts").select("author_id, co_author_ids").eq("id", postId).single();
  if (!post) return { error: "Story not found." };
  if (post.author_id !== user.id) return { error: "Only the primary author can remove collaborators." };

  const nextCoAuthors = (post.co_author_ids || []).filter((id: string) => id !== coAuthorId);
  const { error } = await supabase.from("posts").update({ co_author_ids: nextCoAuthors }).eq("id", postId);
  if (error) return { error: error.message };

  revalidatePath(`/write/${postId}`);
  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export { estimateReadTime };
