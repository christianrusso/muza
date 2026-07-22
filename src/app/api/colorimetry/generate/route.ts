import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateColorimetry, AIColorimetryError } from "@/lib/ai/generateColorimetry";
import { toColorimetry } from "@/lib/colorimetry/map";
import { saveColorimetry } from "@/lib/colorimetry/store";
import { AIBudgetExceededError } from "@/lib/ai/budgetGuard";
import { isDemoMode } from "@/lib/demo";
import { hasColorimetry } from "@/lib/colorimetry/store";
import { getColorimetryEligibility } from "@/lib/colorimetry/eligibility";

// Genera la colorimetría desde la foto (ya validada) y la guarda. Visión detail
// high + salida grande: margen amplio para el gateway de Vercel.
export const maxDuration = 60;

const BodySchema = z.object({ photoPath: z.string().min(1) });

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  }
  const { photoPath } = body.data;

  // Demo: no gasta IA; /result muestra la colorimetría demo.
  if (isDemoMode()) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }
  if (!photoPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Foto no válida." } }, { status: 403 });
  }

  // Gate por comunidad (donde se gasta la IA): solo generamos si el usuario cumple
  // los requisitos. Quien ya tiene su colorimetría no vuelve a pasar por el muro.
  if (!(await hasColorimetry(supabase, user.id))) {
    const { eligible } = await getColorimetryEligibility(supabase, user.id);
    if (!eligible) {
      return NextResponse.json(
        { error: { code: "COMMUNITY_REQUIREMENTS", message: "Completá los requisitos de la comunidad para generar tu colorimetría." } },
        { status: 403 },
      );
    }
  }

  const { data: signed } = await supabase.storage
    .from("colorimetry-photos")
    .createSignedUrl(photoPath, 300);
  if (!signed?.signedUrl) {
    return NextResponse.json(
      { error: { code: "PHOTO_UNAVAILABLE", message: "No se pudo acceder a la foto." } },
      { status: 500 },
    );
  }

  try {
    const result = await generateColorimetry(signed.signedUrl, user.id);
    await saveColorimetry(supabase, user.id, photoPath, toColorimetry(result));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AIBudgetExceededError) {
      return NextResponse.json(
        { error: { code: "AI_BUDGET_EXCEEDED", message: "Servicio no disponible temporalmente." } },
        { status: 503 },
      );
    }
    const message = err instanceof AIColorimetryError ? err.message : "No se pudo generar la colorimetría.";
    console.error(`[looklab] colorimetry generate: ${message}`);
    return NextResponse.json({ error: { code: "GENERATION_FAILED", message } }, { status: 500 });
  }
}
