import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { isDemoMode, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

// Un evento de actividad: alguien (otro usuario) le dio like o comentó un post
// propio, empezó a seguir al usuario, o votó un look propio. Alimenta la pantalla
// /community/activity.
export interface ActivityItem {
  id: string;
  kind: "like" | "comment" | "follow" | "votes";
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  // null en los follows (no hay post asociado).
  postId: string | null;
  postPhotoUrl: string | null;
  commentBody: string | null;
  // Solo en kind "votes": cuántos votos lleva el post. Los votos van SIEMPRE
  // agregados — el autor ve el resumen, nunca quién votó qué (decisión de
  // producto: mostrar votantes rompería la dinámica de "adiviná el score").
  voteCount: number | null;
  createdAt: string;
}

const ACTIVITY_LIMIT = 60;

/**
 * Actividad reciente sobre los posts del usuario actual: likes y comentarios de
 * OTROS usuarios, del más nuevo al más viejo. Se apoya en el RLS de lectura
 * abierta de post_reactions/post_comments/profiles (ver 0003); las miniaturas
 * salen de las analyses propias (owner → legibles).
 */
export async function loadActivity(limit = ACTIVITY_LIMIT): Promise<ActivityItem[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const items: ActivityItem[] = [];
    for (const post of store.posts.values()) {
      const photoUrl = store.analyses.get(post.analysisId)?.photoDataUrl ?? null;
      for (const [actorId, reaction] of post.reactions) {
        if (actorId === DEMO_USER.id || reaction !== "like") continue;
        items.push({
          id: `like-${post.id}-${actorId}`,
          kind: "like",
          actorId: "",
          actorName: "Alguien",
          actorAvatarUrl: null,
          postId: post.id,
          postPhotoUrl: photoUrl,
          commentBody: null,
          voteCount: null,
          createdAt: post.createdAt,
        });
      }
      for (const comment of post.comments) {
        items.push({
          id: `comment-${comment.id}`,
          kind: "comment",
          actorId: "",
          actorName: "Alguien",
          actorAvatarUrl: null,
          postId: post.id,
          postPhotoUrl: photoUrl,
          commentBody: comment.body,
          voteCount: null,
          createdAt: comment.createdAt,
        });
      }
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Mis posts + la foto de cada uno (para la miniatura del evento).
  const { data: myPosts } = await supabase
    .from("community_posts")
    .select("id, analyses(photo_path)")
    .eq("user_id", user.id);
  const posts = myPosts ?? [];
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const photoPathByPost = new Map(
    posts.map((p) => [
      p.id,
      (p as unknown as { analyses: { photo_path: string } | null }).analyses?.photo_path ?? null,
    ]),
  );

  const [{ data: likes }, { data: comments }, { data: follows }, { data: voteRows }, { data: tallies }] =
    await Promise.all([
      supabase
        .from("post_reactions")
        .select("id, post_id, user_id, created_at, profiles(full_name, avatar_url)")
        .in("post_id", postIds)
        .eq("reaction", "like")
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at, profiles(full_name, avatar_url)")
        .in("post_id", postIds)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("follows")
        .select("follower_id, created_at")
        .eq("following_id", user.id)
        .neq("follower_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit),
      // Solo para saber QUÉ posts tienen votos y CUÁNDO fue el último: no se
      // guarda quién votó. El total sale de la vista agregada (abajo), así que
      // este limit no puede desviar el número que ve el autor.
      supabase
        .from("post_votes")
        .select("post_id, created_at")
        .in("post_id", postIds)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit * 5),
      // Totales por post, ya agregados por la vista (ver 0017/0021).
      supabase
        .from("community_feed_view")
        .select("post_id, votes_mejorar, votes_bien, votes_muy_bueno, votes_impecable")
        .in("post_id", postIds),
    ]);

  // Los datos del que sigue: se traen aparte porque follows tiene dos FKs a
  // profiles (follower/following) y el embed sería ambiguo.
  const followerIds = (follows ?? []).map((f) => f.follower_id);
  const { data: followActors } = followerIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", followerIds)
    : { data: [] };
  const actorById = new Map((followActors ?? []).map((a) => [a.id, a]));

  // Firmar las fotos de los posts que aparecen en la actividad (una sola vez cada una).
  const involvedPaths = Array.from(
    new Set(
      [...(likes ?? []), ...(comments ?? []), ...(voteRows ?? [])]
        .map((r) => photoPathByPost.get(r.post_id) ?? null)
        .filter((path): path is string => path !== null),
    ),
  );
  const photoUrls = await signedPhotoUrls(supabase, involvedPaths, "thumb");

  // La relación FK con profiles no está en los tipos generados (Relationships: []),
  // así que casteamos el row al leer el join (mismo patrón que el post detail).
  const actorName = (r: unknown) =>
    (r as { profiles: { full_name: string } | null }).profiles?.full_name ?? "Usuario";
  const actorAvatar = (r: unknown) =>
    (r as { profiles: { avatar_url: string | null } | null }).profiles?.avatar_url ?? null;
  const photoFor = (postId: string) => {
    const path = photoPathByPost.get(postId);
    return path ? (photoUrls.get(path) ?? null) : null;
  };

  const likeItems: ActivityItem[] = (likes ?? []).map((r) => ({
    id: `like-${r.id}`,
    kind: "like",
    actorId: r.user_id,
    actorName: actorName(r),
    actorAvatarUrl: actorAvatar(r),
    postId: r.post_id,
    postPhotoUrl: photoFor(r.post_id),
    commentBody: null,
    voteCount: null,
    createdAt: r.created_at,
  }));

  // Votos: UNA fila por post, no una por voto. Sin votar, votar es la acción más
  // frecuente de la app y listarla de a una convertiría la actividad en ruido.
  // Como los rows vienen ordenados por fecha desc, el primero de cada post es el
  // más reciente y sirve para ordenar el evento.
  const totalVotesByPost = new Map(
    (tallies ?? []).map((t) => [
      t.post_id as string,
      (t.votes_mejorar ?? 0) + (t.votes_bien ?? 0) + (t.votes_muy_bueno ?? 0) + (t.votes_impecable ?? 0),
    ]),
  );
  const lastVoteByPost = new Map<string, string>();
  for (const v of voteRows ?? []) {
    if (!lastVoteByPost.has(v.post_id)) lastVoteByPost.set(v.post_id, v.created_at);
  }
  const voteItems: ActivityItem[] = Array.from(lastVoteByPost.entries())
    .map(([postId, createdAt]) => ({
      id: `votes-${postId}`,
      kind: "votes" as const,
      // Un resumen no tiene autor: el agregado nunca expone quién votó.
      actorId: "",
      actorName: "",
      actorAvatarUrl: null,
      postId,
      postPhotoUrl: photoFor(postId),
      commentBody: null,
      voteCount: totalVotesByPost.get(postId) ?? 0,
      createdAt,
    }))
    .filter((item) => (item.voteCount ?? 0) > 0);

  const commentItems: ActivityItem[] = (comments ?? []).map((c) => ({
    id: `comment-${c.id}`,
    kind: "comment",
    actorId: c.user_id,
    actorName: actorName(c),
    actorAvatarUrl: actorAvatar(c),
    postId: c.post_id,
    postPhotoUrl: photoFor(c.post_id),
    commentBody: c.body,
    voteCount: null,
    createdAt: c.created_at,
  }));

  const followItems: ActivityItem[] = (follows ?? []).map((f) => ({
    id: `follow-${f.follower_id}`,
    kind: "follow",
    actorId: f.follower_id,
    actorName: actorById.get(f.follower_id)?.full_name ?? "Usuario",
    actorAvatarUrl: actorById.get(f.follower_id)?.avatar_url ?? null,
    postId: null,
    postPhotoUrl: null,
    commentBody: null,
    voteCount: null,
    createdAt: f.created_at,
  }));

  return [...likeItems, ...commentItems, ...followItems, ...voteItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/**
 * Cantidad de novedades no leídas para el badge de la tab bar. Delega en la RPC
 * unread_activity_count() (un solo round-trip). En demo, siempre 0.
 */
export async function unreadActivityCount(): Promise<number> {
  if (isDemoMode()) return 0;
  const supabase = await createClient();
  // Un invitado no tiene actividad propia: cortamos antes de la RPC en vez de
  // dejarla fallar contra RLS y caer en el 0 del catch de abajo.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase.rpc("unread_activity_count");
  if (error || typeof data !== "number") return 0;
  return data;
}
