import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreOutfit, AIScoringError } from "@/lib/ai/scoreOutfit";
import { hasEvaluableGarments } from "@/lib/ai/schema";
import { AIBudgetExceededError } from "@/lib/ai/budgetGuard";
import { getFewShotExamples } from "@/lib/scoring/knowledgeBase";
import { computeOverallScore, spreadScore, applicableCategories, SCORE_CATEGORIES } from "@/lib/scoring/categories";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, buildStubScoringResult } from "@/lib/demo";
import { getDemoCreatedAnalysis, updateDemoAnalysisScore } from "@/lib/demoStore";
import type { AnalysisType, OccasionId } from "@/types/domain";

// La llamada a OpenAI (visión, detail "high" + few-shots) puede tardar; le damos
// margen para que no la corte el gateway de Vercel antes de responder.
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isDemoMode()) {
    const analysis = getDemoCreatedAnalysis(id);
    if (!analysis) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Análisis no encontrado." } }, { status: 404 });
    }
    const result = buildStubScoringResult(occasionLabel(analysis.occasionId));
    // Estiramos la escala (ver spreadScore): el general y cada categoría, para que
    // todo quede en la misma escala recalibrada que las bandas de color.
    const overallScore = spreadScore(computeOverallScore(result.categories, result.analysisType));
    updateDemoAnalysisScore(id, {
      overallScore,
      styleDescriptors: result.styleDescriptors,
      // Solo guardamos las categorías que aplican al tipo (ej. sin "calzado" en
      // una foto "superior") para que no aparezcan en el desglose como neutras.
      categories: applicableCategories(result.categories, result.analysisType).map((c) => ({
        categoryKey: c.key,
        weight: SCORE_CATEGORIES.find((d) => d.key === c.key)?.weight ?? 0,
        score: spreadScore(c.score),
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
    .select("id, photo_path, occasion_id, occasion_variant, occasion_context, analysis_type, validity_status, overall_score")
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

  // Idempotencia: si ya está puntuado (ej. la pantalla de resultado se refrescó
  // mientras cargaba), no re-scoreamos ni duplicamos categorías/feedback.
  if (analysis.overall_score !== null) {
    return NextResponse.json({ id: analysis.id, overallScore: analysis.overall_score, alreadyScored: true });
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

  // Género declarado por el usuario para personalizar el scoring (código de moda).
  // Si es null (usuario viejo sin onboardear), el prompt no agrega línea de género.
  const { data: profile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", user.id)
    .single();

  try {
    // Con "Otro", el label ("Otro") no le dice nada al modelo: el texto libre ES la
    // ocasión. Se lo pasamos como label para que la línea del prompt diga la
    // situación real ("...la ocasión es: cumpleaños infantil") en vez de "Otro", y
    // no lo repetimos como contexto aparte. En la base queda igual: occasion_id
    // "other" + occasion_context con el texto.
    const isOther = analysis.occasion_id === "other";
    const freeContext = analysis.occasion_context?.trim() || null;
    const useContextAsOccasion = isOther && Boolean(freeContext);

    const result = await scoreOutfit({
      photoUrl: signed.signedUrl,
      occasionLabel: useContextAsOccasion
        ? freeContext!
        : occasionLabel(analysis.occasion_id as OccasionId),
      occasionVariant: analysis.occasion_variant,
      occasionContext: useContextAsOccasion ? null : freeContext,
      analysisType: analysis.analysis_type as AnalysisType,
      userGender: profile?.gender ?? null,
      examples,
      userId: user.id,
    });

    // Red de seguridad: el validador puede dejar pasar una foto sin outfit
    // evaluable (un primer plano de la cara es el caso típico — hay una persona,
    // está vestida, y sólo el encuadre falla). Si llegamos hasta acá y el modelo
    // no detectó NINGUNA prenda, el score que saldría es basura: la ocasión
    // puntúa bajísimo, occasionCeiling la convierte en el techo del general, y
    // el usuario ve un 16/100 como si fuera un juicio sobre su ropa. Preferimos
    // no guardar nada y mandarlo a /invalid con el motivo correcto.
    //
    // Va DESPUÉS del scoring y no antes porque es la primera vez que tenemos la
    // lista de prendas detectadas; el costo de la llamada ya se pagó igual.
    if (!hasEvaluableGarments(result.detected)) {
      await supabase
        .from("analyses")
        .update({ validity_status: "invalid", ai_raw_response: result })
        .eq("id", id);

      return NextResponse.json(
        {
          error: {
            code: "NO_GARMENTS_DETECTED",
            message: "No pudimos ver prendas para analizar en esta foto.",
            reason: "framing",
          },
        },
        { status: 422 },
      );
    }

    // Estiramos la escala (ver spreadScore): el modelo comprime todo lo decente
    // en ~65-90; esto re-expande esa banda preservando el orden, y deja el general
    // y las categorías en la misma escala que las bandas de color.
    const overallScore = spreadScore(computeOverallScore(result.categories, result.analysisType));

    await supabase
      .from("analyses")
      .update({
        // Un parcial sigue siendo parcial después de puntuarlo. Antes acá se
        // escribía "valid" a secas y se perdía el estado: el análisis aparecía
        // como válido en home/historial/perfil y como publicable en la comunidad,
        // que filtran por validity_status = 'valid'.
        validity_status: analysis.validity_status === "partial" ? "partial" : "valid",
        overall_score: overallScore,
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
      // Solo las categorías que aplican al tipo (ej. sin "calzado" en "superior").
      applicableCategories(result.categories, result.analysisType).map((c) => ({
        analysis_id: id,
        category_key: c.key,
        // weight is looked up server-side from the fixed category defs, never trusted from the model
        weight: SCORE_CATEGORIES.find((d) => d.key === c.key)?.weight ?? 0,
        // Estirado, igual que el general. El score crudo del modelo queda en
        // ai_raw_response por si hay que re-calibrar la curva a futuro.
        score: spreadScore(c.score),
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
    // Tope de gasto alcanzado: no es una falla de la IA, es un corte a propósito.
    if (err instanceof AIBudgetExceededError) {
      return NextResponse.json(
        { error: { code: "AI_BUDGET_EXCEEDED", message: "El servicio está saturado por hoy. Probá más tarde." } },
        { status: 503 },
      );
    }
    const message = err instanceof AIScoringError ? err.message : "Error puntuando el outfit.";
    return NextResponse.json({ error: { code: "AI_SCORING_FAILED", message } }, { status: 502 });
  }
}
