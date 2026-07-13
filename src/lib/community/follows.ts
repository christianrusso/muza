import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

export type FollowListType = "followers" | "following";

export interface FollowUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
  amIFollowing: boolean;
}

export interface FollowList {
  ownerName: string;
  type: FollowListType;
  users: FollowUser[];
}

/**
 * Lista de seguidores ("followers") o de a quién sigue ("following") un usuario.
 * Cada fila trae el estado de follow del usuario ACTUAL para pintar el botón.
 * Se apoya en la lectura abierta de `follows` y `profiles` (ver RLS en 0003).
 */
export async function loadFollowList(userId: string, type: FollowListType): Promise<FollowList | null> {
  if (isDemoMode()) {
    return { ownerName: "Usuario", type, users: [] };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Privacidad: solo podés ver TUS propias listas, no las de otros usuarios.
  if (!user || user.id !== userId) return null;

  const { data: owner } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  if (!owner) return null;

  // followers = quiénes lo siguen (following_id = userId → follower_id)
  // following = a quiénes sigue (follower_id = userId → following_id)
  const { data: rows } =
    type === "followers"
      ? await supabase.from("follows").select("follower_id, created_at").eq("following_id", userId).order("created_at", { ascending: false })
      : await supabase.from("follows").select("following_id, created_at").eq("follower_id", userId).order("created_at", { ascending: false });

  const ids = (rows ?? []).map((r) =>
    type === "followers" ? (r as { follower_id: string }).follower_id : (r as { following_id: string }).following_id,
  );
  if (ids.length === 0) return { ownerName: owner.full_name ?? "Usuario", type, users: [] };

  const [{ data: profiles }, { data: myFollows }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
    user
      ? supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", ids)
      : Promise.resolve({ data: [] as { following_id: string }[] }),
  ]);
  const iFollow = new Set((myFollows ?? []).map((m) => m.following_id));
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Conservar el orden por fecha de follow (el de `rows`).
  const users: FollowUser[] = ids
    .map((uid) => byId.get(uid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      userId: p.id,
      name: p.full_name ?? "Usuario",
      avatarUrl: p.avatar_url,
      isMe: user?.id === p.id,
      amIFollowing: iFollow.has(p.id),
    }));

  return { ownerName: owner.full_name ?? "Usuario", type, users };
}
