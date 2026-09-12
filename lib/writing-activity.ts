import type { SupabaseClient } from "@supabase/supabase-js";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function recordWritingActivity(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  content: string
) {
  const wordCount = countWords(content);
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("writing_activity")
    .select("word_count")
    .eq("user_id", userId)
    .eq("activity_date", today)
    .eq("post_id", postId)
    .maybeSingle();

  const nextCount = Math.max(existing?.word_count || 0, wordCount);

  await supabase.from("writing_activity").upsert(
    {
      user_id: userId,
      activity_date: today,
      post_id: postId,
      word_count: nextCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,activity_date,post_id" }
  );
}