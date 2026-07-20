import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { isDemoMode, DEMO_COMMUNITY_POSTS, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { isBlockedWith } from "@/lib/community/blocks";

export interface ProfilePost {
  postId: string;
  photoUrl: string | null;
  overallScore: number;
  // Score visible solo si el que mira es el dueño o ya votó ese post.
  scoreRevealed: boolean;
}

export interface UserProfile {
  userId: string;
  name: string;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isMe: boolean;
  amIFollowing: boolean;
  posts: ProfilePost[];
}

/** Perfil público de comunidad: portfolio de looks + contadores + estado de follow. */
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (await isBlockedWith(userId)) return null;

  if (isDemoMode()) {
    const store = getDemoStore();
    const seeded = DEMO_COMMUNITY_POSTS.filter((p) => p.author_id === userId);
    const isMe = userId === DEMO_USER.id;
    const name = isMe ? DEMO_USER.full_name : seeded[0]?.author_name ?? "Usuario";
    return {
      userId,
      name,
      avatarUrl: null,
      followerCount: seeded.length > 0 ? 42 : 0,
      followingCount: 18,
      isMe,
      amIFollowing: store.follows.has(userId),
      posts: seeded.map((p) => ({
        postId: p.post_id,
        photoUrl: null,
        overallScore: p.overall_score,
        scoreRevealed: isMe || store.votes.has(p.post_id),
      })),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const [{ count: followerCount }, { count: followingCount }, { data: mine }, { data: posts }] =
    await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      user
        ? supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("following_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("community_feed_view")
        .select("post_id, photo_path, overall_score")
        .eq("author_id", userId)
        .order("posted_at", { ascending: false }),
    ]);

  const rows = posts ?? [];
  const isMe = user?.id === userId;

  // ¿Cuáles de estos posts votó el que mira? Si es su propio perfil, todos van
  // revelados sin consultar. Si mira a otro, solo se revelan los que ya votó.
  const postIds = rows.map((p) => p.post_id);
  let votedPostIds = new Set<string>();
  if (user && !isMe && postIds.length > 0) {
    const { data: myVotes } = await supabase
      .from("post_votes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);
    votedPostIds = new Set((myVotes ?? []).map((v) => v.post_id));
  }

  const photoUrls = await signedPhotoUrls(supabase, rows.map((p) => p.photo_path), "thumb");

  return {
    userId,
    name: profile.full_name ?? "Usuario",
    avatarUrl: profile.avatar_url,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    isMe,
    amIFollowing: Boolean(mine),
    posts: rows.map((p) => ({
      postId: p.post_id,
      photoUrl: photoUrls.get(p.photo_path) ?? null,
      // Score visible solo si es tu propio look o si ya lo votaste. Un invitado
      // no votó nada, así que los ve todos con candado: si acá se los reveláramos
      // podría saltearse el juego del deck entrando por el perfil del autor.
      scoreRevealed: isMe || votedPostIds.has(p.post_id),
      overallScore: p.overall_score ?? 0,
    })),
  };
}
