import { z } from "zod";
import { SCORE_CATEGORIES } from "@/lib/scoring/categories";
import type { CategoryKey } from "@/types/domain";

export const AnalysisTypeSchema = z.enum(["completo", "superior", "inferior", "individual"]);

/**
 * Por qué se rechazó una foto. Es un enum y no el texto libre de `issues`
 * porque la pantalla de rechazo ramifica sobre esto: si dependiera de lo que
 * el modelo redacte en cada corrida, un sinónimo bastaría para romper la
 * clasificación y volver al mensaje genérico.
 *
 * - not_outfit: el sujeto no es vestimenta (comida, mascota, paisaje, objeto,
 *   captura de pantalla, meme).
 * - no_clothing_visible: hay una persona pero no hay ropa que analizar.
 * - framing: hay una persona vestida, pero el encuadre deja las prendas fuera
 *   (primer plano de la cara, recorte muy cerrado). Se separó de `occluded`
 *   porque el problema y el consejo son distintos: acá no hay nada tapando, hay
 *   que alejar la cámara. Sin esta categoría, un retrato pasaba como "valid" y
 *   terminaba con un score bajo que el usuario lee como un juicio sobre su ropa.
 * - occluded: hay ropa en cuadro, pero tapada por objetos u otras personas.
 * - photo_quality: la ropa está, el problema es la foto (luz, foco, resolución).
 */
export const InvalidReasonSchema = z.enum([
  "not_outfit",
  "no_clothing_visible",
  "framing",
  "occluded",
  "photo_quality",
]);
export type InvalidReason = z.infer<typeof InvalidReasonSchema>;

export const ValidationResultSchema = z.object({
  verdict: z.enum(["valid", "partial", "invalid"]),
  analysisType: AnalysisTypeSchema.nullable(),
  issues: z.array(z.string()),
  partialReason: z.string().nullable(),
  invalidReason: InvalidReasonSchema.nullable(),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// Validación de la foto de COLORIMETRÍA. A diferencia del outfit, acá la foto
// tiene que servir para leer la coloración (cara, piel, pelo, ojos). No hay
// "partial": o la foto permite un análisis confiable o no.
export const ColorimetryValidationResultSchema = z.object({
  verdict: z.enum(["valid", "invalid"]),
  issues: z.array(z.string()),
  reason: z.string().nullable(),
});
export type ColorimetryValidationResult = z.infer<typeof ColorimetryValidationResultSchema>;

// Generación de la colorimetría. El modelo devuelve el contenido; los bits de UI
// (íconos de accesorios) los fija el código al mapear a Colorimetry, así el modelo
// no inventa nombres de íconos rotos. Los accesorios son 4 categorías fijas: el
// modelo solo escribe el consejo de cada una.
const ColorimetrySwatchSchema = z.object({ name: z.string(), hex: z.string() });

export const ColorimetryResultSchema = z.object({
  season: z.string(),
  subtone: z.string(),
  contrast: z.string(),
  depth: z.string(),
  // 3 rasgos que definen la temporada; hex = color del puntito de la píldora.
  traits: z.array(z.object({ label: z.string(), hex: z.string() })).length(3),
  bestColors: z.array(ColorimetrySwatchSchema).length(5),
  palette: z.array(ColorimetrySwatchSchema).length(10),
  // Grupos de outfit con prendas sugeridas (3-4 grupos).
  outfitGroups: z.array(z.object({ label: z.string(), items: z.array(z.string()).min(2).max(5) })).min(3).max(4),
  // Consejo por categoría de accesorio (el ícono y el título los pone el código).
  accessories: z.object({
    anteojos: z.string(),
    calzado: z.string(),
    joyeria: z.string(),
    bufandas: z.string(),
  }),
  looks: z.array(z.string()).min(3).max(5),
  avoid: z.array(z.string()).min(2).max(4),
  combine: z.array(z.string()).min(2).max(4),
});
export type ColorimetryResult = z.infer<typeof ColorimetryResultSchema>;

const categoryKeys = SCORE_CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

export const ScoringCategorySchema = z.object({
  key: z.enum(categoryKeys),
  score: z.number().int().min(0).max(100),
  justification: z.string().nullable(),
});

export const DetectedItemsSchema = z.object({
  prendasSuperiores: z.array(z.string()),
  prendasInferiores: z.array(z.string()),
  calzado: z.array(z.string()),
  accesorios: z.array(z.string()),
  colores: z.array(z.string()),
  estilo: z.string().nullable(),
});

export const ScoringResultSchema = z.object({
  analysisType: AnalysisTypeSchema,
  styleDescriptors: z.array(z.string()),
  occasionContext: z.string().nullable(),
  categories: z.array(ScoringCategorySchema).length(SCORE_CATEGORIES.length),
  detected: DetectedItemsSchema,
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type ScoringResult = z.infer<typeof ScoringResultSchema>;

/**
 * ¿El scoring llegó a ver prendas reales? Red de seguridad server-side para las
 * fotos que el validador dejó pasar sin outfit evaluable (típicamente un primer
 * plano de la cara). Sin esto, el motor puntúa igual: la ocasión queda muy baja,
 * `occasionCeiling` la vuelve el techo del score, y sale un 16/100 que el usuario
 * lee como un juicio sobre su ropa en vez de "no vimos tu ropa".
 *
 * Sólo cuentan las tres listas de PRENDAS. Los accesorios quedan fuera a
 * propósito: un retrato suele devolver aros o anteojos, y eso no es un outfit.
 */
export function hasEvaluableGarments(detected: z.infer<typeof DetectedItemsSchema>): boolean {
  return (
    detected.prendasSuperiores.length > 0 ||
    detected.prendasInferiores.length > 0 ||
    detected.calzado.length > 0
  );
}
