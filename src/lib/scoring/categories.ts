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

// La adecuación a la ocasión actúa como TECHO del score final, no solo como un
// término más del promedio ponderado. Motivo: con la ponderación sola (ocasión
// pesa 20%), un outfit muy inadecuado para la ocasión igual quedaba en ~60
// porque las otras categorías lo sostenían (ej. remera de fútbol para un
// casamiento → 61). Con el techo, si la ocasión puntúa bajo, el score final no
// puede superar ese techo. La ocasión solo puede BAJAR el score, nunca inflarlo.
// Validado contra ground truth (2026-07-02): no baja ningún caso bien puntuado.
export function occasionCeiling(occasionScore: number): number {
  if (occasionScore >= 70) return 100; // ocasión adecuada → sin techo
  if (occasionScore >= 40) return 40 + (occasionScore - 40) * 2; // zona media (40→40, 70→100)
  return occasionScore; // desajuste fuerte → el techo es la propia nota de ocasión
}

export function computeOverallScore(categories: { key: CategoryKey; score: number }[]): number {
  const weighted = categories.reduce((sum, c) => {
    const def = SCORE_CATEGORIES.find((d) => d.key === c.key);
    return sum + (def ? def.weight * c.score : 0);
  }, 0);
  const occasion = categories.find((c) => c.key === "ocasion");
  const capped = occasion ? Math.min(weighted, occasionCeiling(occasion.score)) : weighted;
  return Math.round(capped);
}
