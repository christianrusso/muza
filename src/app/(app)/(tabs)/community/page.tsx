import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_COMMUNITY_POSTS, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { PostCard } from "@/components/community/PostCard";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { AnalysisType, OccasionId } from "@/types/domain";

const TABS = [
  { value: "popular", label: "Popular" },
  { value: "reciente", label: "Reciente" },
  { value: "siguiendo", label: "Siguiendo" },
] as const;

interface FeedPost {
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
}

async function loadCommunityFeed(activeTab: string): Promise<FeedPost[]> {
  if (isDemoMode()) {
    const created = Array.from(getDemoStore().posts.values()).map((p) => {
      const analysis = getDemoStore().analyses.get(p.analysisId);
      return {
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
      };
    });
    const seeded = DEMO_COMMUNITY_POSTS.map((p) => ({
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
    }));
    const all = [...created, ...seeded];
    return activeTab === "siguiendo" ? [] : all;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("community_feed_view").select("*");

  if (activeTab === "siguiendo") {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user!.id);
    const followingIds = (follows ?? []).map((f) => f.following_id);
    query = query.in("author_id", followingIds.length ? followingIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  query =
    activeTab === "popular"
      ? query.order("like_count", { ascending: false })
      : query.order("posted_at", { ascending: false });

  const { data: posts } = await query.limit(30);

  const { data: myReactions } = await supabase
    .from("post_reactions")
    .select("post_id, reaction")
    .eq("user_id", user!.id);
  const myReactionByPost = new Map((myReactions ?? []).map((r) => [r.post_id, r.reaction]));

  return Promise.all(
    (posts ?? []).map(async (p) => {
      const { data: signed } = await supabase.storage
        .from("outfit-photos")
        .createSignedUrl(p.photo_path, 3600);
      return {
        post_id: p.post_id,
        author_name: p.author_name,
        occasion_id: p.occasion_id,
        posted_at: p.posted_at,
        analysis_type: p.analysis_type,
        photoUrl: signed?.signedUrl ?? null,
        overall_score: p.overall_score,
        like_count: p.like_count,
        comment_count: p.comment_count,
        myReaction: (myReactionByPost.get(p.post_id) ?? null) as "like" | "dislike" | null,
      };
    }),
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab ?? "popular";
  const withPhotoUrls = await loadCommunityFeed(activeTab);

  return (
    <div className="flex min-h-full flex-col pt-[60px]">
      <div className="flex items-center justify-between px-[22px] pb-3">
        <span className="font-serif italic" style={{ fontSize: 34 }}>
          Comunidad
        </span>
        <button type="button" className="btn-icon" style={{ width: 40, height: 40, borderRadius: 12 }}>
          <MaterialIcon name="search" size={21} />
        </button>
      </div>

      <div className="flex gap-5 border-b border-line px-[22px]">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/community?tab=${t.value}`}
            className={`feed-tab ${activeTab === t.value ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-5 px-[22px] py-4">
        {withPhotoUrls.map((post) => (
          <PostCard
            key={post.post_id}
            post={{
              id: post.post_id,
              authorName: post.author_name,
              occasionLabel: occasionLabel(post.occasion_id as OccasionId),
              postedAt: post.posted_at,
              analysisType: post.analysis_type ?? "completo",
              photoUrl: post.photoUrl,
              overallScore: post.overall_score ?? 0,
              likeCount: post.like_count,
              commentCount: post.comment_count,
              myReaction: post.myReaction,
            }}
          />
        ))}
        {withPhotoUrls.length === 0 && (
          <p className="py-10 text-center text-sm font-semibold text-muted">
            Todavía no hay publicaciones acá.
          </p>
        )}
      </div>

      <Link href="/community/publish" className="fab">
        <MaterialIcon name="add_a_photo" />
        Publicar
      </Link>
    </div>
  );
}
