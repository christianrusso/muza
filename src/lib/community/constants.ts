import { SCORE_LEVELS, scoreLevel, type ScoreLevel } from "@/lib/scoring/categories";

// Tamaño de página del feed de comunidad. Se cargan de a 10 y el scroll infinito
// pide la siguiente tanda. Vive fuera de feed.ts (server-only) para poder
// importarse también desde el componente cliente de scroll infinito.
export const FEED_PAGE_SIZE = 10;

// Tabs de la pestaña Comunidad. "votá" (modo swipe, principal) y "siguiendo"
// (feed social de los perfiles que seguís). Las viejas popular/reciente se
// retiran; se normaliza cualquier valor desconocido a "votá".
export type CommunityTab = "vota" | "siguiendo";

/**
 * Tab efectiva a partir del query param.
 *
 * "Siguiendo" no existe sin sesión (no hay a quién seguir), así que un invitado
 * cae siempre en "Votá": ve el deck pero no puede votar — cualquier toque le
 * abre el muro (ver VoteDeck y CommunityTabs).
 */
export function normalizeTab(tab: string | undefined, isAuthed = true): CommunityTab {
  if (!isAuthed) return "vota";
  return tab === "siguiendo" ? "siguiendo" : "vota";
}

// ===== Votación "adiviná el score" =====
// Las opciones de voto SON los 4 niveles de la escala (ver SCORE_LEVELS en
// lib/scoring/categories). Antes eran tres franjas propias (menos de 25 / 25-75 /
// más de 75) que quedaron rotas al recalibrar el puntaje: con la escala nueva casi
// todo cae entre 45 y 80, así que "Medio" acertaba siempre y el juego perdía
// sentido. Usando los mismos niveles, adivinar es adivinar la etiqueta que va a
// mostrar el resultado — y una sola palabra significa lo mismo en toda la app.
export type VoteBucket = ScoreLevel;

export const VOTE_BUCKETS: { bucket: VoteBucket; label: string; range: string }[] = SCORE_LEVELS.map(
  (l, i) => {
    const next = SCORE_LEVELS[i + 1];
    return {
      bucket: l.level,
      label: l.label,
      range: next ? `${l.min} – ${next.min - 1}` : `${l.min} o más`,
    };
  },
);

// Punto medio de cada nivel: convierte los votos (categóricos) en un "score de
// comunidad" numérico comparable al de la IA. El último nivel es abierto (80-100),
// así que su punto medio se calcula contra 100.
const BUCKET_MIDPOINT: Record<VoteBucket, number> = SCORE_LEVELS.reduce(
  (acc, l, i) => {
    const top = SCORE_LEVELS[i + 1] ? SCORE_LEVELS[i + 1].min - 1 : 100;
    acc[l.level] = Math.round((l.min + top) / 2);
    return acc;
  },
  {} as Record<VoteBucket, number>,
);

export function bucketLabel(bucket: VoteBucket): string {
  return SCORE_LEVELS.find((l) => l.level === bucket)?.label ?? bucket;
}

/** En qué nivel cae un score de la IA (para saber si el usuario acertó). */
export function bucketForScore(score: number): VoteBucket {
  return scoreLevel(score);
}

/** Conteo de votos por nivel. Alimenta el consenso de la comunidad. */
export type VoteTally = Record<VoteBucket, number>;

/** Tally en cero, para inicializar sin repetir las claves en cada lugar. */
export function emptyTally(): VoteTally {
  return SCORE_LEVELS.reduce((acc, l) => {
    acc[l.level] = 0;
    return acc;
  }, {} as VoteTally);
}

/**
 * Score de comunidad: promedio ponderado de los puntos medios de cada nivel,
 * redondeado. Devuelve null si todavía no hay votos.
 */
export function communityScore(tally: VoteTally): number | null {
  const total = SCORE_LEVELS.reduce((sum, l) => sum + (tally[l.level] ?? 0), 0);
  if (total === 0) return null;
  const sum = SCORE_LEVELS.reduce(
    (acc, l) => acc + (tally[l.level] ?? 0) * BUCKET_MIDPOINT[l.level],
    0,
  );
  return Math.round(sum / total);
}
