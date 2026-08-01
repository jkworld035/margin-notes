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
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  if (!title || !excerpt || !content) {
    return { error: "Title, excerpt, and content are all required." };
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
      status: "approved",
      cover_image_url: coverImageUrl || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/");
  redirect(`/post/${inserted.id}`);
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

export { estimateReadTime };
