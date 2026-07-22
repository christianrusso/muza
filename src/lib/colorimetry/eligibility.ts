import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Generar la colorimetría tiene costo (IA de visión + imágenes). Para abrirla al
// público sin fundirnos, pedimos dos cosas: COMPARTIR un look (trae gente nueva —
// es el "pagás trayendo") y una participación mínima votando en la comunidad.
// Antes pedíamos también subir un post y comentar; los sacamos para bajar la
// fricción y por fin medir demanda real de colorimetría. Como es una sola por
// usuario, el chequeo va al momento de generarla; una vez que la tiene, la ve
// siempre.
export const COLORIMETRY_REQUIREMENTS = {
  shares: 1, // compartir un look al menos una vez (gate blando: profiles.first_shared_at)
  votes: 5, // votos dados
} as const;

export type ColorimetryEligibility = {
  eligible: boolean;
  progress: {
    shares: { have: number; need: number };
    votes: { have: number; need: number };
  };
};

/**
 * Cuenta la participación del usuario y la compara contra los requisitos.
 * `shares` sale del flag first_shared_at del perfil (0/1); `votes` cuenta filas.
 * Devuelve el progreso por requisito para poder mostrar el checklist.
 */
export async function getColorimetryEligibility(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ColorimetryEligibility> {
  const [profileRes, votesRes] = await Promise.all([
    supabase.from("profiles").select("first_shared_at").eq("id", userId).single(),
    supabase.from("post_votes").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const shares = profileRes.data?.first_shared_at ? 1 : 0;
  const votes = votesRes.count ?? 0;

  const eligible =
    shares >= COLORIMETRY_REQUIREMENTS.shares && votes >= COLORIMETRY_REQUIREMENTS.votes;

  return {
    eligible,
    progress: {
      shares: { have: shares, need: COLORIMETRY_REQUIREMENTS.shares },
      votes: { have: votes, need: COLORIMETRY_REQUIREMENTS.votes },
    },
  };
}
