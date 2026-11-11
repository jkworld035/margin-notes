import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, created_at, author_id, content")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1000);

  // Only list substantial posts (300+ words); short ones are marked noindex on their own page.
  const wordCount = (html: string | null) =>
    String(html ?? "").replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  const goodPosts = (posts || []).filter((p) => wordCount(p.content) >= 300);

  const postEntries: MetadataRoute.Sitemap = goodPosts.map((p) => ({
    url: `${siteUrl}/post/${p.id}`,
    lastModified: new Date(p.created_at),
    changeFrequency: "weekly",
  }));

  const authorIds = Array.from(new Set(goodPosts.map((p) => p.author_id)));
  const authorEntries: MetadataRoute.Sitemap = authorIds.map((id) => ({
    url: `${siteUrl}/author/${id}`,
    changeFrequency: "weekly",
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...postEntries,
    ...authorEntries,
  ];
}
