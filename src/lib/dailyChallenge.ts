import "server-only";
import { loadCommunityFeed } from "@/lib/community/feed";

export interface DailyChallengeItem {
  id: string;
  photoUrl: string | null;
  occasionLabel: string;
  overallScore: number;
  /** Porcentaje de coincidencia con la comunidad, 0-100. */
  agreementRate: number;
}

// Determinístico a partir del id (no random en cada render), hasta que exista
// una tabla real de respuestas del reto (ver adaptive-scoring/phases/01-fase-1b).
function mockAgreementRate(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  return 55 + (hash % 41); // 55-95%
}

/**
 * Arma el reto diario a partir de posteos reales de la comunidad (mismo dato
 * que el feed, ver adaptive-scoring/08-daily-challenge.md). Es el camino de
 * respaldo que ya describe ese documento: sin cola de desacuerdo real todavía,
 * se completa con análisis recientes en vez de fallar o quedar vacío.
 */
export async function loadDailyChallenge(): Promise<DailyChallengeItem[]> {
  const posts = await loadCommunityFeed("reciente", 0, 3);
  return posts.map((p) => ({
    id: p.id,
    photoUrl: p.photoUrl,
    occasionLabel: p.occasionLabel,
    overallScore: p.overallScore,
    agreementRate: mockAgreementRate(p.id),
  }));
}
