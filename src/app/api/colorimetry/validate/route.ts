import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateColorimetryPhoto, AIColorimetryValidationError } from "@/lib/ai/validateColorimetryPhoto";
import { AIBudgetExceededError } from "@/lib/ai/budgetGuard";
import { isDemoMode } from "@/lib/demo";

// Valida una foto ya subida al bucket colorimetry-photos. Llama a OpenAI (visión
// detail high); margen para que no lo corte el gateway de Vercel.
export const maxDuration = 60;

const BodySchema = z.object({ photoPath: z.string().min(1) });

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  }
  const { photoPath } = body.data;

  // Demo: no gasta IA, siempre válida (para recorrer el flujo sin credenciales).
  if (isDemoMode()) {
    return NextResponse.json({ verdict: "valid", issues: [], reason: null });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  // El path tiene que ser del propio usuario ({user_id}/...). El RLS del bucket ya
  // lo scopea, pero no firmamos la ruta de otro por las dudas.
  if (!photoPath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Foto no válida." } }, { status: 403 });
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
    const result = await validateColorimetryPhoto(signed.signedUrl, user.id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AIBudgetExceededError) {
      return NextResponse.json(
        { error: { code: "AI_BUDGET_EXCEEDED", message: "Servicio no disponible temporalmente." } },
        { status: 503 },
      );
    }
    const message = err instanceof AIColorimetryValidationError ? err.message : "No se pudo validar la foto.";
    console.error(`[looklab] colorimetry validate: ${message}`);
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", message } }, { status: 500 });
  }
}
