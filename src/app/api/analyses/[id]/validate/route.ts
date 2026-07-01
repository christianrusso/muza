import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateOutfitImage, AIValidationError } from "@/lib/ai/validateImage";
import { isDemoMode, buildStubValidationResult } from "@/lib/demo";
import { getDemoCreatedAnalysis, updateDemoAnalysisValidation } from "@/lib/demoStore";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (isDemoMode()) {
    const analysis = getDemoCreatedAnalysis(id);
    if (!analysis) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Análisis no encontrado." } }, { status: 404 });
    }
    const result = buildStubValidationResult();
    updateDemoAnalysisValidation(id, { validityStatus: result.verdict, analysisType: result.analysisType });
    return NextResponse.json(result);
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
    .select("id, photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Análisis no encontrado." } }, { status: 404 });
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

  try {
    const result = await validateOutfitImage(signed.signedUrl);

    await supabase
      .from("analyses")
      .update({
        validity_status: result.verdict,
        analysis_type: result.analysisType,
      })
      .eq("id", id);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof AIValidationError ? err.message : "Error validando la imagen.";
    return NextResponse.json({ error: { code: "AI_VALIDATION_FAILED", message } }, { status: 502 });
  }
}
