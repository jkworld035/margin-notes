"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleLike(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to like a post." };

  const { data: existing } = await supabase
    .from("likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("likes").insert({ post_id: postId, user_id: user.id });

    const { data: post } = await supabase.from("posts").select("author_id").eq("id", postId).single();
    if (post && post.author_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: post.author_id,
        actor_id: user.id,
        type: "like",
        post_id: postId,
      });
    }
  }

  revalidatePath(`/post/${postId}`);
  return { liked: !existing };
}

export async function addComment(postId: string, content: string, parentId?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to comment." };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Comment can't be empty." };
  if (trimmed.length > 1000) return { error: "Comment is too long." };

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    content: trimmed,
    parent_id: parentId || null,
  });

  if (error) return { error: error.message };

  if (parentId) {
    const { data: parent } = await supabase.from("comments").select("author_id").eq("id", parentId).single();
    if (parent && parent.author_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: parent.author_id,
        actor_id: user.id,
        type: "reply",
        post_id: postId,
      });
    }
  } else {
    const { data: post } = await supabase.from("posts").select("author_id").eq("id", postId).single();
    if (post && post.author_id !== user.id) {
      await supabase.from("notifications").insert({
        recipient_id: post.author_id,
        actor_id: user.id,
        type: "comment",
        post_id: postId,
      });
    }
  }

  revalidatePath(`/post/${postId}`);
  return { success: true };
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  revalidatePath(`/post/${postId}`);
}

export async function toggleFollow(targetUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to follow." };
  if (user.id === targetUserId) return { error: "You can't follow yourself." };

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
  } else {
    await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
    await supabase.from("notifications").insert({
      recipient_id: targetUserId,
      actor_id: user.id,
      type: "follow",
    });
  }

  revalidatePath(`/author/${targetUserId}`);
  revalidatePath("/");
  return { following: !existing };
}

export async function toggleBookmark(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to save a story." };

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("bookmarks").insert({ post_id: postId, user_id: user.id });
  }

  revalidatePath(`/post/${postId}`);
  revalidatePath("/profile");
  return { saved: !existing };
}

export async function logView(postId: string) {
  const supabase = await createClient();
  // best-effort — failures here should never break the reading experience
  await supabase.from("post_views").insert({ post_id: postId });
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read: true }).eq("recipient_id", user.id).eq("read", false);
  revalidatePath("/notifications");
}

export async function reportContent({
  postId,
  commentId,
  reason,
}: {
  postId?: string;
  commentId?: string;
  reason: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to report content." };

  const trimmed = reason.trim();
  if (!trimmed) return { error: "Please describe the issue." };
  if (!postId && !commentId) return { error: "Nothing to report." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: postId || null,
    comment_id: commentId || null,
    reason: trimmed,
  });

  if (error) return { error: error.message };
  return { success: true };
}
