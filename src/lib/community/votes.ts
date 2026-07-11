import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_COMMUNITY_POSTS, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import type { AnalysisType, OccasionId } from "@/types/domain";

// Una carta del modo "Votá". El score de la IA viaja al cliente pero se muestra
// recién en el reveal (después de votar).
export interface VoteCardData {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  occasionLabel: string;
  postedAt: string;
  analysisType: AnalysisType;
  photoUrl: string | null;
  overallScore: number;
  amIFollowing: boolean;
}

// Cuántas cartas mandamos por tanda. El cliente las consume de a una.
export const VOTE_QUEUE_SIZE = 12;
// Traemos de más para poder descartar las ya votadas y aún así llenar la tanda.
const CANDIDATE_FETCH = 60;

/**
 * Cola de looks para votar, con lógica de relevancia:
 *   - excluye los posts propios y los que el usuario ya votó,
 *   - prioriza los looks cuyo autor comparte el género del usuario (señal de
 *     relevancia; resuelve el "muestra cualquier cosa"), y dentro de eso los más
 *     nuevos primero.
 */
export async function loadVoteQueue(limit = VOTE_QUEUE_SIZE): Promise<VoteCardData[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    return DEMO_COMMUNITY_POSTS.filter(
      (p) => p.author_id !== DEMO_USER.id && !store.votes.has(p.post_id),
    )
      .slice(0, limit)
      .map((p) => ({
        postId: p.post_id,
        authorId: p.author_id,
        authorName: p.author_name,
        authorAvatarUrl: p.author_avatar_url,
        occasionLabel: occasionLabel(p.occasion_id as OccasionId),
        postedAt: p.posted_at,
        analysisType: p.analysis_type,
        photoUrl: null,
        overallScore: p.overall_score,
        amIFollowing: store.follows.has(p.author_id),
      }));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: myVotes }, { data: following }, { data: me }] = await Promise.all([
    supabase.from("post_votes").select("post_id").eq("user_id", user.id),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase.from("profiles").select("gender").eq("id", user.id).maybeSingle(),
  ]);

  const votedPostIds = new Set((myVotes ?? []).map((v) => v.post_id));
  const followingIds = new Set((following ?? []).map((f) => f.following_id));
  const myGender = me?.gender ?? null;

  const { data: candidates } = await supabase
    .from("community_feed_view")
    .select("*")
    .neq("author_id", user.id)
    .order("posted_at", { ascending: false })
    .limit(CANDIDATE_FETCH);

  const fresh = (candidates ?? []).filter((p) => !votedPostIds.has(p.post_id));

  // Orden estable: primero los looks del mismo género (si el usuario lo declaró),
  // conservando el orden por fecha que ya trae la query.
  fresh.sort((a, b) => {
    if (!myGender) return 0;
    const am = a.author_gender === myGender ? 0 : 1;
    const bm = b.author_gender === myGender ? 0 : 1;
    return am - bm;
  });

  const queue = fresh.slice(0, limit);
  const photoUrls = await signedPhotoUrls(supabase, queue.map((p) => p.photo_path), "feed");

  return queue.map((p) => ({
    postId: p.post_id,
    authorId: p.author_id,
    authorName: p.author_name,
    authorAvatarUrl: p.author_avatar_url,
    occasionLabel: occasionLabel(p.occasion_id as OccasionId),
    postedAt: p.posted_at,
    analysisType: p.analysis_type ?? "completo",
    photoUrl: photoUrls.get(p.photo_path) ?? null,
    overallScore: p.overall_score ?? 0,
    amIFollowing: followingIds.has(p.author_id),
  }));
}
