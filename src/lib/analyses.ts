import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrl } from "@/lib/supabase/photos";
import { isDemoMode, DEMO_ANALYSES, getDemoAnalysis } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import type { Analysis, AnalysisCategoryRow, AnalysisFeedbackRow, CategoryKey, FeedbackKind } from "@/types/domain";

export async function getHydratedAnalysis(id: string): Promise<Analysis | null> {
  if (isDemoMode()) {
    if (DEMO_ANALYSES.some((a) => a.id === id)) {
      return getDemoAnalysis(id);
    }
    const created = getDemoStore().analyses.get(id);
    if (created) {
      return {
        id: created.id,
        userId: "demo-user",
        occasionId: created.occasionId,
        occasionVariant: null,
        photoPath: "",
        photoUrl: created.photoDataUrl ?? undefined,
        analysisType: created.analysisType ?? "completo",
        validityStatus: created.validityStatus,
        overallScore: created.overallScore,
        qualitativeBadge: created.qualitativeBadge,
        styleDescriptors: created.styleDescriptors,
        detectedPrendasSuperiores: [],
        detectedPrendasInferiores: [],
        detectedCalzado: [],
        detectedAccesorios: [],
        detectedColores: [],
        detectedEstilo: null,
        createdAt: created.createdAt,
        categories: created.categories,
        feedback: created.feedback,
      };
    }
    return null;
  }

  const supabase = await createClient();

  const { data: row } = await supabase.from("analyses").select("*").eq("id", id).single();
  if (!row) return null;

  const [{ data: categories }, { data: feedback }, photoUrl] = await Promise.all([
    supabase
      .from("analysis_categories")
      .select("category_key, weight, score, justification")
      .eq("analysis_id", id),
    supabase
      .from("analysis_feedback")
      .select("kind, text, sort_order")
      .eq("analysis_id", id)
      .order("sort_order", { ascending: true }),
    signedPhotoUrl(supabase, row.photo_path, "full"),
  ]);

  const categoryRows: AnalysisCategoryRow[] = (categories ?? []).map((c) => ({
    categoryKey: c.category_key as CategoryKey,
    weight: c.weight,
    score: c.score,
    justification: c.justification,
  }));

  const feedbackRows: AnalysisFeedbackRow[] = (feedback ?? []).map((f) => ({
    kind: f.kind as FeedbackKind,
    text: f.text,
    sortOrder: f.sort_order,
  }));

  return {
    id: row.id,
    userId: row.user_id,
    occasionId: row.occasion_id as Analysis["occasionId"],
    occasionVariant: row.occasion_variant,
    photoPath: row.photo_path,
    photoUrl: photoUrl ?? undefined,
    analysisType: (row.analysis_type ?? "completo") as Analysis["analysisType"],
    validityStatus: row.validity_status as Analysis["validityStatus"],
    overallScore: row.overall_score,
    qualitativeBadge: row.qualitative_badge,
    styleDescriptors: row.style_descriptors,
    detectedPrendasSuperiores: row.detected_prendas_superiores,
    detectedPrendasInferiores: row.detected_prendas_inferiores,
    detectedCalzado: row.detected_calzado,
    detectedAccesorios: row.detected_accesorios,
    detectedColores: row.detected_colores,
    detectedEstilo: row.detected_estilo,
    createdAt: row.created_at,
    categories: categoryRows,
    feedback: feedbackRows,
  };
}
