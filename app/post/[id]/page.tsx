import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { estimateReadTime } from "@/app/actions/posts";
import { renderContent } from "@/lib/render-content";
import LikeButton from "./like-button";
import BookmarkButton from "./bookmark-button";
import ShareButton from "./share-button";
import ReportButton from "./report-button";
import Comments from "./comments";
import AdSlot from "@/app/ad-slot";
import ViewTracker from "./view-tracker";
import ReadingProgress from "./reading-progress";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, excerpt, cover_image_url, profiles!posts_author_id_fkey(name)")
    .eq("id", id)
    .single();

  if (!post) return { title: "Story not found — Margin Notes" };

  const authorName = (post.profiles as any)?.name;
  const title = `${post.title} — Margin Notes`;
  const description = post.excerpt;
  const url = `${siteUrl}/post/${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      url,
      ...(authorName ? { authors: [authorName] } : {}),
      ...(post.cover_image_url ? { images: [{ url: post.cover_image_url }] } : {}),
    },
    twitter: {
      card: post.cover_image_url ? "summary_large_image" : "summary",
      title: post.title,
      description,
      ...(post.cover_image_url ? { images: [post.cover_image_url] } : {}),
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, title, subtitle, excerpt, content, category, tags, created_at, status, cover_image_url, author_id, co_author_ids, profiles!posts_author_id_fkey(name)"
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

  const { data: coAuthors } =
    post.co_author_ids && post.co_author_ids.length > 0
      ? await supabase.from("profiles").select("name").in("id", post.co_author_ids)
      : { data: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: likeCount }, { data: myLike }, { data: comments }, { data: myBookmark }, { count: viewCount }] =
    await Promise.all([
      supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", id),
      user
        ? supabase.from("likes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("comments")
        .select("id, content, created_at, author_id, parent_id, profiles(name)")
        .eq("post_id", id)
        .order("created_at", { ascending: true }),
      user
        ? supabase.from("bookmarks").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", id),
    ]);

  const authorName = (post.profiles as any)?.name || "";
  const postUrl = `${siteUrl}/post/${post.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.created_at,
    dateModified: post.created_at,
    author: [
      { "@type": "Person", name: authorName, url: `${siteUrl}/author/${post.author_id}` },
      ...(coAuthors || []).map((c: any) => ({ "@type": "Person", name: c.name })),
    ],
    publisher: {
      "@type": "Organization",
      name: "Margin Notes",
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon-512.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    ...(post.cover_image_url ? { image: [post.cover_image_url] } : {}),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTracker postId={post.id} />
      <ReadingProgress targetId="post-body" />
      <div className="post-view">
        <Link href="/" className="post-view-back">
          &#8592; Back to all stories
        </Link>
        <span className="post-view-tag">{post.category}</span>
        <h1>{post.title}</h1>
        {post.subtitle && <p className="post-view-subtitle">{post.subtitle}</p>}
        <div className="post-view-meta">
          <Link href={`/author/${post.author_id}`} style={{ color: "inherit", textDecoration: "none" }}>
            {authorName}
          </Link>
          {coAuthors && coAuthors.length > 0 && (
            <span> &amp; {coAuthors.map((c: any) => c.name).join(", ")}</span>
          )}
          <span className="meta-dot">·</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span className="meta-dot">·</span>
          <span>{estimateReadTime(post.content)} read</span>
          <span className="meta-dot">·</span>
          <span>{viewCount || 0} views</span>
        </div>

        {post.cover_image_url && (
          <div style={{ position: "relative", width: "100%", height: "420px", marginBottom: "2rem" }}>
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              sizes="(max-width: 760px) 100vw, 760px"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        )}

        <div id="post-body" className="post-view-body">
          {renderContent(post.content)}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="post-view-tags">
            {post.tags.map((t: string) => (
              <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="tag-chip">
                {t}
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: "2rem", display: "flex", gap: ".6rem", alignItems: "center" }}>
          <LikeButton
            postId={post.id}
            initialCount={likeCount || 0}
            initialLiked={!!myLike}
            isLoggedIn={!!user}
          />
          <BookmarkButton postId={post.id} initialSaved={!!myBookmark} isLoggedIn={!!user} />
          <ShareButton postId={post.id} title={post.title} />
          {user && (user.id === post.author_id || (post.co_author_ids || []).includes(user.id)) && (
            <Link href={`/write/${post.id}`} className="btn btn-ghost btn-sm">
              Edit
            </Link>
          )}
          {user && user.id !== post.author_id && <ReportButton postId={post.id} />}
        </div>

        <AdSlot slot="2222222222" />

        <Comments
          postId={post.id}
          initialComments={(comments as any) || []}
          isLoggedIn={!!user}
          currentUserId={user?.id || null}
        />
      </div>
    </div>
  );
}
