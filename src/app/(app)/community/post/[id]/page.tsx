import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrl } from "@/lib/supabase/photos";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_USER, DEMO_COMMUNITY_POSTS } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { ScreenHead } from "@/components/navigation/TopBar";
import { PostCard, type PostCardData } from "@/components/community/PostCard";
import { CommentForm } from "@/components/community/CommentForm";
import type { OccasionId } from "@/types/domain";

async function loadPost(id: string): Promise<{ post: PostCardData; comments: { id: string; body: string; author: string }[] } | null> {
  if (isDemoMode()) {
    const created = getDemoStore().posts.get(id);
    if (created) {
      const analysis = getDemoStore().analyses.get(created.analysisId);
      return {
        post: {
          id: created.id,
          authorName: DEMO_USER.full_name,
          occasionLabel: occasionLabel(analysis?.occasionId ?? "other"),
          postedAt: created.createdAt,
          analysisType: analysis?.analysisType ?? "completo",
          photoUrl: analysis?.photoDataUrl ?? null,
          overallScore: analysis?.overallScore ?? 0,
          likeCount: Array.from(created.reactions.values()).filter((r) => r === "like").length,
          commentCount: created.comments.length,
          myReaction: created.reactions.get(DEMO_USER.id) ?? null,
        },
        comments: created.comments.map((c) => ({ id: c.id, body: c.body, author: DEMO_USER.full_name })),
      };
    }
    const seeded = DEMO_COMMUNITY_POSTS.find((p) => p.post_id === id);
    if (!seeded) return null;
    return {
      post: {
        id: seeded.post_id,
        authorName: seeded.author_name,
        occasionLabel: occasionLabel(seeded.occasion_id),
        postedAt: seeded.posted_at,
        analysisType: seeded.analysis_type,
        photoUrl: null,
        overallScore: seeded.overall_score,
        likeCount: seeded.like_count,
        commentCount: seeded.comment_count,
        myReaction: null,
      },
      comments: [],
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post } = await supabase.from("community_feed_view").select("*").eq("post_id", id).single();
  if (!post) return null;

  const photoUrl = await signedPhotoUrl(supabase, post.photo_path, "full");

  const { data: myReaction } = await supabase
    .from("post_reactions")
    .select("reaction")
    .eq("post_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: comments } = await supabase
    .from("post_comments")
    .select("id, body, created_at, user_id, profiles(full_name)")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  return {
    post: {
      id: post.post_id,
      authorName: post.author_name,
      occasionLabel: occasionLabel(post.occasion_id as OccasionId),
      postedAt: post.posted_at,
      analysisType: post.analysis_type ?? "completo",
      photoUrl,
      overallScore: post.overall_score ?? 0,
      likeCount: post.like_count,
      commentCount: post.comment_count,
      myReaction: (myReaction?.reaction ?? null) as "like" | "dislike" | null,
    },
    comments: (comments ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      author:
        (c as unknown as { profiles: { full_name: string } | null }).profiles?.full_name ?? "Usuario",
    })),
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadPost(id);
  if (!data) notFound();

  return (
    <div className="screen-body pad">
      <ScreenHead title="Publicación" backHref="/community" />

      <PostCard post={data.post} />

      <div className="mt-6 flex flex-col gap-4">
        <span className="text-[15px] font-extrabold">Comentarios</span>
        {data.comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="ph h-8 w-8 flex-none rounded-full" />
            <div>
              <span className="block text-[13px] font-extrabold">{c.author}</span>
              <span className="text-[13px] font-semibold text-ink">{c.body}</span>
            </div>
          </div>
        ))}
        {data.comments.length === 0 && (
          <p className="text-sm font-semibold text-muted">Sé el primero en comentar.</p>
        )}
      </div>

      <CommentForm postId={id} />
    </div>
  );
}
