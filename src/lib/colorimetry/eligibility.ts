import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Generar la colorimetría tiene costo (IA de visión + imágenes). Para abrirla al
// público sin fundirnos, pedimos participación mínima en la comunidad: es un
// "pagás ayudando a la comunidad". Como la colorimetría es una sola por usuario,
// el chequeo va al momento de generarla; una vez que la tiene, la ve siempre.
export const COLORIMETRY_REQUIREMENTS = {
  posts: 1, // fotos subidas a la comunidad
  comments: 1, // comentarios hechos
  votes: 5, // votos dados
} as const;

export type ColorimetryEligibility = {
  eligible: boolean;
  progress: {
    posts: { have: number; need: number };
    comments: { have: number; need: number };
    votes: { have: number; need: number };
  };
};

/**
 * Cuenta la participación del usuario en la comunidad y la compara contra los
 * requisitos. Devuelve el progreso por requisito para poder mostrar el checklist.
 */
export async function getColorimetryEligibility(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ColorimetryEligibility> {
  const [postsRes, commentsRes, votesRes] = await Promise.all([
    supabase.from("community_posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    // Los comentarios ocultos (soft-delete) no cuentan.
    supabase
      .from("post_comments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("hidden_at", null),
    supabase.from("post_votes").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const posts = postsRes.count ?? 0;
  const comments = commentsRes.count ?? 0;
  const votes = votesRes.count ?? 0;

  const eligible =
    posts >= COLORIMETRY_REQUIREMENTS.posts &&
    comments >= COLORIMETRY_REQUIREMENTS.comments &&
    votes >= COLORIMETRY_REQUIREMENTS.votes;

  return {
    eligible,
    progress: {
      posts: { have: posts, need: COLORIMETRY_REQUIREMENTS.posts },
      comments: { have: comments, need: COLORIMETRY_REQUIREMENTS.comments },
      votes: { have: votes, need: COLORIMETRY_REQUIREMENTS.votes },
    },
  };
}
