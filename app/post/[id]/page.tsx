import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { estimateReadTime } from "@/app/actions/posts";
import { renderContent } from "@/lib/render-content";
import LikeButton from "./like-button";
import BookmarkButton from "./bookmark-button";
import ShareButton from "./share-button";
import Comments from "./comments";
import ViewTracker from "./view-tracker";
import ReadingProgress from "./reading-progress";

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

  if (!post) return { title: "Story not found — Jkworld035" };

  const authorName = (post.profiles as any)?.name;
  const title = `${post.title} — Jkworld035`;
  const description = post.excerpt;

  return {
    title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
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
      "id, title, subtitle, excerpt, content, category, tags, created_at, status, cover_image_url, author_id, profiles!posts_author_id_fkey(name)"
    )
    .eq("id", id)
    .single();

  if (!post) notFound();

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
        .select("id, content, created_at, author_id, profiles(name)")
        .eq("post_id", id)
        .order("created_at", { ascending: true }),
      user
        ? supabase.from("bookmarks").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", id),
    ]);

  return (
    <div>
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
            {(post.profiles as any)?.name}
          </Link>
          <span className="meta-dot">·</span>
          <span>{new Date(post.created_at).toLocaleDateString()}</span>
          <span className="meta-dot">·</span>
          <span>{estimateReadTime(post.content)} read</span>
          <span className="meta-dot">·</span>
          <span>{viewCount || 0} views</span>
        </div>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt=""
            style={{ width: "100%", maxHeight: "420px", objectFit: "cover", marginBottom: "2rem" }}
          />
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
          {user && user.id === post.author_id && (
            <Link href={`/write/${post.id}`} className="btn btn-ghost btn-sm">
              Edit
            </Link>
          )}
        </div>

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
