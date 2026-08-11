import { createClient } from "@/lib/supabase/server";

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, excerpt, created_at, profiles!posts_author_id_fkey(name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (posts || [])
    .map((p: any) => {
      const url = `${siteUrl}/post/${p.id}`;
      const author = p.profiles?.name || "";
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
      ${author ? `<author>${escapeXml(author)}</author>` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Jkworld035 — Margin Notes</title>
    <link>${siteUrl}</link>
    <description>Read, write, and discover long-form essays.</description>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
