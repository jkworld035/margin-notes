import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1000);

  const postEntries: MetadataRoute.Sitemap = (posts || []).map((p) => ({
    url: `${siteUrl}/post/${p.id}`,
    lastModified: new Date(p.created_at),
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
  ];
}
