import type { CategoryKey } from "@/types/domain";

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  weight: number;
}

// Fixed weighted categories from the functional spec (2.7 Algoritmo de puntuación).
// Weights sum to 1 (100%). Order matches the design's "Desglose por categoría" list.
export const SCORE_CATEGORIES: CategoryDef[] = [
  { key: "ocasion", label: "Adecuación a la ocasión", weight: 0.2 },
  { key: "fit", label: "Fit", weight: 0.15 },
  { key: "colores", label: "Combinación de colores", weight: 0.15 },
  { key: "coherencia", label: "Coherencia del outfit", weight: 0.15 },
  { key: "calzado", label: "Calzado", weight: 0.1 },
  { key: "proporciones", label: "Proporciones", weight: 0.1 },
  { key: "accesorios", label: "Accesorios", weight: 0.05 },
  { key: "estado_prendas", label: "Estado de las prendas", weight: 0.05 },
  { key: "modernidad", label: "Modernidad", weight: 0.03 },
  { key: "originalidad", label: "Originalidad", weight: 0.02 },
];

export function categoryLabel(key: CategoryKey): string {
  return SCORE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

// Score-band thresholds observed in the design (Historial/Resultado mockups):
// >=75 green, 60-74 amber, <60 red.
export const SCORE_BAND_THRESHOLDS = { high: 75, medium: 60 } as const;

export type ScoreBand = "high" | "medium" | "low";

export function scoreBand(score: number): ScoreBand {
  if (score >= SCORE_BAND_THRESHOLDS.high) return "high";
  if (score >= SCORE_BAND_THRESHOLDS.medium) return "medium";
  return "low";
}

export function scoreBandColorVar(score: number): string {
  const band = scoreBand(score);
  return band === "high" ? "var(--green)" : band === "medium" ? "var(--amber)" : "var(--red)";
}

export function computeOverallScore(categories: { key: CategoryKey; score: number }[]): number {
  const total = categories.reduce((sum, c) => {
    const def = SCORE_CATEGORIES.find((d) => d.key === c.key);
    return sum + (def ? def.weight * c.score : 0);
  }, 0);
  return Math.round(total);
}
