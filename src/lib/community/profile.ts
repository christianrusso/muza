import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { isDemoMode, DEMO_COMMUNITY_POSTS, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

export interface ProfilePost {
  postId: string;
  photoUrl: string | null;
  overallScore: number;
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
      posts: seeded.map((p) => ({ postId: p.post_id, photoUrl: null, overallScore: p.overall_score })),
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
  const photoUrls = await signedPhotoUrls(supabase, rows.map((p) => p.photo_path), "thumb");

  return {
    userId,
    name: profile.full_name ?? "Usuario",
    avatarUrl: profile.avatar_url,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
    isMe: user?.id === userId,
    amIFollowing: Boolean(mine),
    posts: rows.map((p) => ({
      postId: p.post_id,
      photoUrl: photoUrls.get(p.photo_path) ?? null,
      overallScore: p.overall_score ?? 0,
    })),
  };
}
