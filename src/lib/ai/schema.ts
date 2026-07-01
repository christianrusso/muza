import { z } from "zod";
import { SCORE_CATEGORIES } from "@/lib/scoring/categories";
import type { CategoryKey } from "@/types/domain";

export const AnalysisTypeSchema = z.enum(["completo", "superior", "inferior", "individual"]);

export const ValidationResultSchema = z.object({
  verdict: z.enum(["valid", "partial", "invalid"]),
  analysisType: AnalysisTypeSchema.nullable(),
  issues: z.array(z.string()),
  partialReason: z.string().nullable(),
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
