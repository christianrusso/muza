import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreOutfit, AIScoringError } from "@/lib/ai/scoreOutfit";
import { getFewShotExamples } from "@/lib/scoring/knowledgeBase";
import { computeOverallScore, SCORE_CATEGORIES } from "@/lib/scoring/categories";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, buildStubScoringResult } from "@/lib/demo";
import { getDemoCreatedAnalysis, updateDemoAnalysisScore } from "@/lib/demoStore";
import type { AnalysisType, OccasionId } from "@/types/domain";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isDemoMode()) {
    const analysis = getDemoCreatedAnalysis(id);
    if (!analysis) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Análisis no encontrado." } }, { status: 404 });
    }
    const result = buildStubScoringResult(occasionLabel(analysis.occasionId));
    const overallScore = computeOverallScore(result.categories, result.analysisType);
    updateDemoAnalysisScore(id, {
      overallScore,
      qualitativeBadge: result.qualitativeBadge,
      styleDescriptors: result.styleDescriptors,
      categories: result.categories.map((c) => ({
        categoryKey: c.key,
        weight: SCORE_CATEGORIES.find((d) => d.key === c.key)?.weight ?? 0,
        score: c.score,
        justification: c.justification,
      })),
      feedback: [
        ...result.strengths.map((text, i) => ({ kind: "fortaleza" as const, text, sortOrder: i })),
        ...result.improvements.map((text, i) => ({ kind: "aspecto_mejorar" as const, text, sortOrder: i })),
        ...result.recommendations.map((text, i) => ({ kind: "recomendacion" as const, text, sortOrder: i })),
      ],
    });
    return NextResponse.json({ id, overallScore, aiRawResponse: result });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, photo_path, occasion_id, occasion_variant, analysis_type, validity_status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Análisis no encontrado." } }, { status: 404 });
  }
  if (analysis.validity_status === "invalid" || !analysis.analysis_type) {
    return NextResponse.json(
      { error: { code: "NOT_VALIDATED", message: "El análisis no pasó la validación de imagen." } },
      { status: 409 },
    );
  }

  const { data: signed } = await supabase.storage
    .from("outfit-photos")
    .createSignedUrl(analysis.photo_path, 300);

  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: { code: "PHOTO_UNAVAILABLE", message: "No se pudo acceder a la foto." } },
      { status: 500 },
    );
  }

  // Ejemplos de referencia (few-shot). Devuelve [] si el flag está apagado o no
  // hay ejemplos para la ocasión → el scoring se comporta igual que hoy.
  const examples = await getFewShotExamples(supabase, analysis.occasion_id as string);

  try {
    const result = await scoreOutfit({
      photoUrl: signed.signedUrl,
      occasionLabel: occasionLabel(analysis.occasion_id as OccasionId),
      occasionVariant: analysis.occasion_variant,
      analysisType: analysis.analysis_type as AnalysisType,
      examples,
    });

    const overallScore = computeOverallScore(result.categories, result.analysisType);

    await supabase
      .from("analyses")
      .update({
        validity_status: "valid",
        overall_score: overallScore,
        qualitative_badge: result.qualitativeBadge,
        style_descriptors: result.styleDescriptors,
        detected_prendas_superiores: result.detected.prendasSuperiores,
        detected_prendas_inferiores: result.detected.prendasInferiores,
        detected_calzado: result.detected.calzado,
        detected_accesorios: result.detected.accesorios,
        detected_colores: result.detected.colores,
        detected_estilo: result.detected.estilo,
        ai_raw_response: result,
      })
      .eq("id", id);

    await supabase.from("analysis_categories").insert(
      result.categories.map((c) => ({
        analysis_id: id,
        category_key: c.key,
        // weight is looked up server-side from the fixed category defs, never trusted from the model
        weight: SCORE_CATEGORIES.find((d) => d.key === c.key)?.weight ?? 0,
        score: c.score,
        justification: c.justification,
      })),
    );

    const feedbackRows = [
      ...result.strengths.map((text, i) => ({ kind: "fortaleza" as const, text, sort_order: i })),
      ...result.improvements.map((text, i) => ({ kind: "aspecto_mejorar" as const, text, sort_order: i })),
      ...result.recommendations.map((text, i) => ({ kind: "recomendacion" as const, text, sort_order: i })),
    ];
    await supabase
      .from("analysis_feedback")
      .insert(feedbackRows.map((row) => ({ ...row, analysis_id: id })));

    await supabase.rpc("increment_analysis_usage", { p_user_id: user.id });

    return NextResponse.json({ id, overallScore, aiRawResponse: result });
  } catch (err) {
    const message = err instanceof AIScoringError ? err.message : "Error puntuando el outfit.";
    return NextResponse.json({ error: { code: "AI_SCORING_FAILED", message } }, { status: 502 });
  }
}
