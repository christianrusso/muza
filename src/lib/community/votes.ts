import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_COMMUNITY_POSTS, DEMO_USER } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import type { AnalysisType, OccasionId, UserGender } from "@/types/domain";

// Una carta del modo "Votá". El score de la IA viaja al cliente pero se muestra
// recién en el reveal (después de votar).
export interface VoteCardData {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  authorGender: UserGender | null;
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

/** Fisher-Yates sobre una copia: no toca el array original. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Cola de looks para votar:
 *   - excluye los posts propios y los que ya vinieron en esta sesión (`exclude`),
 *   - el orden es completamente aleatorio: no mira género, ni fecha, ni score,
 *   - nunca se queda sin cartas. Si no alcanzan los looks sin votar, recicla los
 *     ya votados (el voto se pisa vía upsert, ver /api/community/posts/[id]/vote).
 *
 * La ventana de candidatos arranca en un offset al azar del corpus: si se ordenara
 * por fecha y se cortaran los primeros CANDIDATE_FETCH, el usuario solo vería los
 * looks más nuevos por más que después se barajen.
 */
export async function loadVoteQueue(
  limit = VOTE_QUEUE_SIZE,
  exclude: string[] = [],
): Promise<VoteCardData[]> {
  const excluded = new Set(exclude);

  if (isDemoMode()) {
    const store = getDemoStore();
    const mine = DEMO_COMMUNITY_POSTS.filter((p) => p.author_id !== DEMO_USER.id);
    const fresh = mine.filter((p) => !store.votes.has(p.post_id) && !excluded.has(p.post_id));
    // Mismo reciclado que en producción, para que el demo tampoco se quede seco.
    const recycled = mine.filter((p) => store.votes.has(p.post_id) && !excluded.has(p.post_id));
    const picked = [...shuffle(fresh), ...shuffle(recycled)].slice(0, limit);
    // El demo tiene un puñado de posts: la ventana de "no repitas" puede taparlos
    // a todos. Igual que en producción, `exclude` cede antes que la cola.
    if (picked.length === 0 && exclude.length > 0) return loadVoteQueue(limit, []);
    return picked.map((p) => ({
      postId: p.post_id,
      authorId: p.author_id,
      authorName: p.author_name,
      authorAvatarUrl: p.author_avatar_url,
      authorGender: (p.author_gender as UserGender | undefined) ?? null,
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

  // Sin sesión leemos con el cliente admin: las policies de comunidad son
  // "to authenticated" (0003/0017) y un invitado no leería ni una fila. Lo que
  // sale de acá es community_feed_view — posts ya publicados, o sea contenido
  // público. El invitado VE el deck pero no juega: el muro salta al tocar un
  // voto (ver VoteDeck) y, como el score solo se revela votando, sigue tapado.
  const db = user ? supabase : createAdminClient();

  // Un invitado no tiene votos previos ni follows: las dos consultas son sobre
  // datos propios, así que solo van si hay sesión.
  let votedPostIds = new Set<string>();
  let followingIds = new Set<string>();

  if (user) {
    const [{ data: myVotes }, { data: following }] = await Promise.all([
      supabase.from("post_votes").select("post_id").eq("user_id", user.id),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
    ]);
    votedPostIds = new Set((myVotes ?? []).map((v) => v.post_id));
    followingIds = new Set((following ?? []).map((f) => f.following_id));
  }

  // Los looks propios no se votan. Un invitado no tiene.
  const notMine = <T extends { neq: (c: string, v: string) => T }>(q: T) =>
    user ? q.neq("author_id", user.id) : q;

  // Primero, TODO lo real. Son pocos por definición (los usuarios que publican
  // son un puñado) contra cientos de posts semilla, así que acá no hace falta
  // ventana al azar: entran todos y el shuffle los desordena. El tope está por
  // las dudas de que algún día dejen de ser pocos.
  const { data: realCandidates } = await notMine(
    db
      .from("community_feed_view")
      .select("*")
      .eq("author_is_seed", false)
      .order("posted_at", { ascending: false })
      .limit(CANDIDATE_FETCH),
  );

  // Después, semilla para rellenar. Solo se consulta si lo real no alcanza a
  // llenar la tanda: con la comunidad ya poblada, esta query deja de correr.
  const realPool = (realCandidates ?? []).filter((p) => !excluded.has(p.post_id));
  const realFresh = shuffle(realPool.filter((p) => !votedPostIds.has(p.post_id)));
  const realRecycled = shuffle(realPool.filter((p) => votedPostIds.has(p.post_id)));

  let seedFresh: typeof realPool = [];
  let seedRecycled: typeof realPool = [];

  if (realFresh.length < limit) {
    // Cuánta semilla hay, para elegir dónde abrir la ventana.
    const { count } = await notMine(
      db
        .from("community_feed_view")
        .select("post_id", { count: "exact", head: true })
        .eq("author_is_seed", true),
    );
    const total = count ?? 0;

    if (total > 0) {
      // Offset al azar. El .order() sigue estando porque .range() necesita un
      // orden estable para paginar; la aleatoriedad la ponen el offset y el
      // shuffle de abajo.
      const offset = Math.floor(Math.random() * Math.max(1, total - CANDIDATE_FETCH + 1));
      const { data: seedCandidates } = await notMine(
        db
          .from("community_feed_view")
          .select("*")
          .eq("author_is_seed", true)
          .order("posted_at", { ascending: false })
          .range(offset, offset + CANDIDATE_FETCH - 1),
      );
      const seedPool = (seedCandidates ?? []).filter((p) => !excluded.has(p.post_id));
      seedFresh = shuffle(seedPool.filter((p) => !votedPostIds.has(p.post_id)));
      seedRecycled = shuffle(seedPool.filter((p) => votedPostIds.has(p.post_id)));
    }
  }

  // El orden es la regla entera: lo real sin votar primero, y recién cuando se
  // agota entra la semilla. Los ya votados van al final de todo (el voto se pisa
  // vía upsert) — un look semilla nuevo es mejor carta que un real repetido.
  const queue = [...realFresh, ...seedFresh, ...realRecycled, ...seedRecycled].slice(0, limit);
  // La ventana al azar puede caer entera dentro de lo ya visto en esta sesión.
  // Reintentamos una vez sin `exclude` (que ya no puede volver a vaciarla) para
  // no devolver una tanda vacía teniendo corpus.
  if (queue.length === 0 && exclude.length > 0) return loadVoteQueue(limit, []);

  const photoUrls = await signedPhotoUrls(db, queue.map((p) => p.photo_path), "feed");

  return queue.map((p) => ({
    postId: p.post_id,
    authorId: p.author_id,
    authorName: p.author_name,
    authorAvatarUrl: p.author_avatar_url,
    authorGender: (p.author_gender as UserGender | null) ?? null,
    occasionLabel: occasionLabel(p.occasion_id as OccasionId),
    postedAt: p.posted_at,
    analysisType: p.analysis_type ?? "completo",
    photoUrl: photoUrls.get(p.photo_path) ?? null,
    overallScore: p.overall_score ?? 0,
    amIFollowing: followingIds.has(p.author_id),
  }));
}
