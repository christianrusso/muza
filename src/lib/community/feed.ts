import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_COMMUNITY_POSTS, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { FEED_PAGE_SIZE, normalizeTab, type FeedTab } from "@/lib/community/constants";
import type { PostCardData } from "@/components/community/PostCard";
import type { AnalysisType, OccasionId } from "@/types/domain";

function toCard(row: {
  post_id: string;
  author_name: string;
  occasion_id: string;
  posted_at: string;
  analysis_type: AnalysisType | null;
  photoUrl: string | null;
  overall_score: number | null;
  like_count: number;
  comment_count: number;
  myReaction: "like" | "dislike" | null;
}): PostCardData {
  return {
    id: row.post_id,
    authorName: row.author_name,
    occasionLabel: occasionLabel(row.occasion_id as OccasionId),
    postedAt: row.posted_at,
    analysisType: row.analysis_type ?? "completo",
    photoUrl: row.photoUrl,
    overallScore: row.overall_score ?? 0,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    myReaction: row.myReaction,
  };
}

function sortForTab(tab: FeedTab, a: { like: number; at: string }, b: { like: number; at: string }): number {
  if (tab === "popular" && a.like !== b.like) return b.like - a.like;
  return b.at.localeCompare(a.at);
}

/**
 * Carga una página del feed de comunidad, ordenada según la pestaña activa:
 * "popular" = más likes primero, "reciente" = más nuevo primero. Devuelve como
 * máximo `limit` posteos empezando en `offset` (scroll infinito).
 */
export async function loadCommunityFeed(
  activeTab: string,
  offset = 0,
  limit = FEED_PAGE_SIZE,
): Promise<PostCardData[]> {
  const tab = normalizeTab(activeTab);

  if (isDemoMode()) {
    const store = getDemoStore();
    const created = Array.from(store.posts.values()).map((p) => {
      const analysis = store.analyses.get(p.analysisId);
      return toCard({
        post_id: p.id,
        author_name: DEMO_USER.full_name,
        occasion_id: analysis?.occasionId ?? "other",
        posted_at: p.createdAt,
        analysis_type: analysis?.analysisType ?? "completo",
        photoUrl: analysis?.photoDataUrl ?? null,
        overall_score: analysis?.overallScore ?? 0,
        like_count: Array.from(p.reactions.values()).filter((r) => r === "like").length,
        comment_count: p.comments.length,
        myReaction: p.reactions.get(DEMO_USER.id) ?? null,
      });
    });
    const seeded = DEMO_COMMUNITY_POSTS.map((p) =>
      toCard({
        post_id: p.post_id,
        author_name: p.author_name,
        occasion_id: p.occasion_id,
        posted_at: p.posted_at,
        analysis_type: p.analysis_type,
        photoUrl: null,
        overall_score: p.overall_score,
        like_count: p.like_count,
        comment_count: p.comment_count,
        myReaction: null,
      }),
    );
    return [...created, ...seeded]
      .sort((a, b) => sortForTab(tab, { like: a.likeCount, at: a.postedAt }, { like: b.likeCount, at: b.postedAt }))
      .slice(offset, offset + limit);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("community_feed_view").select("*");
  // Orden secundario por fecha para que la paginación sea estable aun con empates.
  query =
    tab === "popular"
      ? query.order("like_count", { ascending: false }).order("posted_at", { ascending: false })
      : query.order("posted_at", { ascending: false });

  const { data: posts } = await query.range(offset, offset + limit - 1);
  const rows = posts ?? [];

  const postIds = rows.map((p) => p.post_id);
  const { data: myReactions } = user
    ? await supabase.from("post_reactions").select("post_id, reaction").eq("user_id", user.id).in("post_id", postIds)
    : { data: [] };
  const myReactionByPost = new Map((myReactions ?? []).map((r) => [r.post_id, r.reaction]));

  const photoUrls = await signedPhotoUrls(supabase, rows.map((p) => p.photo_path), "feed");

  return rows.map((p) =>
    toCard({
      post_id: p.post_id,
      author_name: p.author_name,
      occasion_id: p.occasion_id,
      posted_at: p.posted_at,
      analysis_type: p.analysis_type,
      photoUrl: photoUrls.get(p.photo_path) ?? null,
      overall_score: p.overall_score,
      like_count: p.like_count,
      comment_count: p.comment_count,
      myReaction: (myReactionByPost.get(p.post_id) ?? null) as "like" | "dislike" | null,
    }),
  );
}
