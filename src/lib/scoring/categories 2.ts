import type { CategoryKey, AnalysisType } from "@/types/domain";

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

// Estiramiento de la escala. GPT-4o visión amontona TODO lo decente entre ~65 y
// ~90 (medido: 8 outfits casual distintos → rango de 8 puntos, y 7 fotos de una
// misma usuaria → todas 75-79). El modelo SÍ ordena bien (un outfit mejor queda
// arriba, verificado en 3 corridas y en 2 modelos), pero comprime el número en
// una banda donde no se percibe. Ni un prompt calibrado ni un modelo más nuevo
// lo arreglan (gpt-4.1 comprime aún más). La única salida es re-expandir la banda.
//
// Esta curva monótona por tramos mapea la zona densa a un rango más ancho,
// preservando el orden (dos outfits nunca cambian de posición). Se aplica a cada
// categoría y al score general por igual, así todo queda en la misma escala y las
// bandas de color de abajo valen para ambos. Es cosmético a propósito: no inventa
// señal, hace visible la que el modelo ya da.
//
// Calibrada contra DATOS REALES de producción: dos usuarios distintos con fotos
// casual dieron todos 73-80 (rango de 6-7 puntos). Ahí es donde hay que estirar
// fuerte, no en 80-90. La pendiente máxima (~2x) está en 68-80 por eso. Verificado:
// esos 73-80 se abren a ~55-70 (rango 15) sin romper el ranking ni la zona alta.
const SPREAD_ANCHORS: [number, number][] = [
  [0, 0],
  [55, 30],
  [68, 45],
  [80, 70],
  [90, 88],
  [100, 100],
];

export function spreadScore(raw: number): number {
  const x = Math.max(0, Math.min(100, raw));
  for (let i = 0; i < SPREAD_ANCHORS.length - 1; i++) {
    const [x0, y0] = SPREAD_ANCHORS[i];
    const [x1, y1] = SPREAD_ANCHORS[i + 1];
    if (x >= x0 && x <= x1) return Math.round(y0 + ((x - x0) / (x1 - x0)) * (y1 - y0));
  }
  return Math.round(x);
}

// ===== Los 4 niveles de la escala =====
// FUENTE ÚNICA DE VERDAD. El mismo corte y las mismas palabras se usan en el aro
// del resultado, en el historial, en la tarjeta que se comparte y en los botones
// de voto de la comunidad. Antes había tres escalas distintas conviviendo (la
// landing decía 0-59/60-79/80-100, la app cortaba el verde en 75 y los votos en
// 25/75), así que el mismo número significaba cosas distintas según dónde lo
// leyeras. Si algún día se mueve un corte, se mueve acá y en ningún otro lado.
//
// Los cortes 45 y 65 vienen de la calibración de spreadScore contra datos reales;
// el de 80 agrega el escalón aspiracional (pocos outfits lo alcanzan, y por eso
// significa algo cuando aparece).
export type ScoreLevel = "mejorar" | "bien" | "muy_bueno" | "impecable";

export const SCORE_LEVELS: {
  level: ScoreLevel;
  label: string;
  /** Desde este puntaje, inclusive. El siguiente nivel marca el techo. */
  min: number;
  colorVar: string;
  /** Hex real: la tarjeta compartible (Satori) no resuelve variables CSS. */
  hex: string;
}[] = [
  { level: "mejorar", label: "A mejorar", min: 0, colorVar: "var(--red)", hex: "#e5484d" },
  { level: "bien", label: "Va bien", min: 45, colorVar: "var(--amber)", hex: "#f5a524" },
  { level: "muy_bueno", label: "Muy bueno", min: 65, colorVar: "var(--lime)", hex: "#8faf3e" },
  { level: "impecable", label: "Impecable", min: 80, colorVar: "var(--green)", hex: "#2fa36b" },
];

/** En qué nivel cae un puntaje. */
export function scoreLevel(score: number): ScoreLevel {
  // De mayor a menor: el primero cuyo mínimo alcanza.
  for (let i = SCORE_LEVELS.length - 1; i >= 0; i--) {
    if (score >= SCORE_LEVELS[i].min) return SCORE_LEVELS[i].level;
  }
  return "mejorar";
}

function levelDef(score: number) {
  const level = scoreLevel(score);
  return SCORE_LEVELS.find((l) => l.level === level)!;
}

/** Etiqueta del nivel ("Va bien", "Impecable"…). */
export function scoreLevelLabel(score: number): string {
  return levelDef(score).label;
}

export function scoreBandColorVar(score: number): string {
  return levelDef(score).colorVar;
}

export function scoreBandHex(score: number): string {
  return levelDef(score).hex;
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

// Categorías que NO aplican según el tipo de análisis. En una foto "superior"
// (solo torso) no hay calzado visible: puntuarlo y meterlo en el promedio castiga
// algo que no existe (10% del score fijo en ~70 o menos). Esas categorías se
// descartan y su peso se REPARTE entre las que sí aplican (renormalización), en
// vez de arrastrar el overall hacia abajo. La ocasión nunca se descarta (es el techo).
const INAPPLICABLE_BY_TYPE: Partial<Record<AnalysisType, CategoryKey[]>> = {
  superior: ["calzado"],
};

// Fuente de verdad de qué categorías aplican según el tipo. Se usa tanto para el
// promedio (descarta y renormaliza) como para el guardado/desglose (que la
// categoría directamente NO aparezca, en vez de mostrarse con un 70 "neutro" que
// parece restar). Ej.: en una foto "superior" no hay calzado → no se muestra.
export function applicableCategories<T extends { key: CategoryKey }>(
  categories: T[],
  analysisType?: AnalysisType,
): T[] {
  const inapplicable = new Set(analysisType ? INAPPLICABLE_BY_TYPE[analysisType] ?? [] : []);
  return categories.filter((c) => !inapplicable.has(c.key));
}

export function computeOverallScore(
  categories: { key: CategoryKey; score: number }[],
  analysisType?: AnalysisType,
): number {
  const applicable = applicableCategories(categories, analysisType);

  // Renormalizar: dividir por la suma de pesos de las categorías que aplican.
  // Con todas presentes suma 1 (sin efecto); al descartar "calzado" (0.1) el
  // divisor es 0.9 y el resto se reparte ese 10%.
  const totalWeight = applicable.reduce((sum, c) => {
    const def = SCORE_CATEGORIES.find((d) => d.key === c.key);
    return sum + (def ? def.weight : 0);
  }, 0);
  const weightedSum = applicable.reduce((sum, c) => {
    const def = SCORE_CATEGORIES.find((d) => d.key === c.key);
    return sum + (def ? def.weight * c.score : 0);
  }, 0);
  const weighted = totalWeight > 0 ? weightedSum / totalWeight : 0;

  const occasion = categories.find((c) => c.key === "ocasion");
  const capped = occasion ? Math.min(weighted, occasionCeiling(occasion.score)) : weighted;
  return Math.round(capped);
}
