// Tamaño de página del feed de comunidad. Se cargan de a 10 y el scroll infinito
// pide la siguiente tanda. Vive fuera de feed.ts (server-only) para poder
// importarse también desde el componente cliente de scroll infinito.
export const FEED_PAGE_SIZE = 10;

// Tabs de la pestaña Comunidad. "votá" (modo swipe, principal) y "siguiendo"
// (feed social de los perfiles que seguís). Las viejas popular/reciente se
// retiran; se normaliza cualquier valor desconocido a "votá".
export type CommunityTab = "vota" | "siguiendo";

export function normalizeTab(tab: string | undefined): CommunityTab {
  return tab === "siguiendo" ? "siguiendo" : "vota";
}

// ===== Votación "adiviná el score" =====
export type VoteBucket = "low" | "mid" | "high";

// Las 3 franjas que ve el usuario. Los límites coinciden con la escala 0-100 de
// la IA: bajo = menos de 25, medio = 25-75, alto = más de 75.
export const VOTE_BUCKETS: { bucket: VoteBucket; label: string; range: string }[] = [
  { bucket: "low", label: "Bajo", range: "menos de 25" },
  { bucket: "mid", label: "Medio", range: "25 – 75" },
  { bucket: "high", label: "Alto", range: "más de 75" },
];

const BUCKET_LABEL: Record<VoteBucket, string> = { low: "Bajo", mid: "Medio", high: "Alto" };
// Punto medio de cada franja: sirve para convertir los votos (categóricos) en un
// "score de comunidad" numérico comparable al de la IA.
const BUCKET_MIDPOINT: Record<VoteBucket, number> = { low: 12.5, mid: 50, high: 87.5 };

export function bucketLabel(bucket: VoteBucket): string {
  return BUCKET_LABEL[bucket];
}

/** En qué franja cae un score de la IA (para saber si el usuario acertó). */
export function bucketForScore(score: number): VoteBucket {
  if (score < 25) return "low";
  if (score > 75) return "high";
  return "mid";
}

/** Conteo de votos por franja. Alimenta el consenso de la comunidad. */
export interface VoteTally {
  low: number;
  mid: number;
  high: number;
}

/**
 * Score de comunidad: promedio ponderado de los puntos medios de cada franja,
 * redondeado. Devuelve null si todavía no hay votos.
 */
export function communityScore(tally: VoteTally): number | null {
  const total = tally.low + tally.mid + tally.high;
  if (total === 0) return null;
  const sum =
    tally.low * BUCKET_MIDPOINT.low + tally.mid * BUCKET_MIDPOINT.mid + tally.high * BUCKET_MIDPOINT.high;
  return Math.round(sum / total);
}
