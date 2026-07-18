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
 * - occluded: hay ropa, pero tapada o fuera de cuadro.
 * - photo_quality: la ropa está, el problema es la foto (luz, foco, resolución).
 */
export const InvalidReasonSchema = z.enum([
  "not_outfit",
  "no_clothing_visible",
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
  qualitativeBadge: z.string(),
  detected: DetectedItemsSchema,
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type ScoringResult = z.infer<typeof ScoringResultSchema>;
