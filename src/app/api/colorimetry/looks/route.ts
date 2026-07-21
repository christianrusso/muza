import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLookImage, AILookImageError } from "@/lib/ai/generateLookImage";
import { AIBudgetExceededError } from "@/lib/ai/budgetGuard";
import { isDemoMode } from "@/lib/demo";
import type { Colorimetry } from "@/types/colorimetry";

// Genera las imágenes de los looks de la colorimetría guardada. 4 imágenes en
// paralelo → margen amplio para el gateway.
export const maxDuration = 60;
const BUCKET = "colorimetry-photos";
const SIGNED_TTL = 600;

async function signPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
): Promise<(string | null)[]> {
  return Promise.all(
    paths.map(async (p) => {
      if (!p) return null;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, SIGNED_TTL);
      return data?.signedUrl ?? null;
    }),
  );
}

export async function POST() {
  if (isDemoMode()) {
    // En demo no se generan imágenes: el resultado deja los placeholders.
    return NextResponse.json({ urls: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "No autenticado." } }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("colorimetries")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "No tenés colorimetría." } }, { status: 404 });
  }
  const colorimetry = row.data as unknown as Colorimetry;

  // Idempotente: si ya se generaron, devolvemos las firmadas y listo.
  if (colorimetry.lookImages?.some((p) => p)) {
    return NextResponse.json({ urls: await signPaths(supabase, colorimetry.lookImages) });
  }

  // Género declarado: sin esto el modelo tira a moda femenina por defecto.
  const { data: profile } = await supabase.from("profiles").select("gender").eq("id", user.id).single();
  const gender = profile?.gender ?? null;

  try {
    // Cada look se genera y sube por separado; allSettled para no perder los que
    // salieron bien si uno falla. Los fallidos quedan como "" (placeholder en UI).
    const results = await Promise.allSettled(
      colorimetry.looks.map(async (look) => {
        const png = await generateLookImage(look, colorimetry, gender);
        const path = `${user.id}/looks/${crypto.randomUUID()}.png`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, png, { contentType: "image/png" });
        if (upErr) throw upErr;
        return path;
      }),
    );

    const paths = results.map((r) => (r.status === "fulfilled" ? r.value : ""));
    // Log de debug (borrar después).
    console.log(
      `[looklab] colorimetry looks → ${paths.filter(Boolean).length}/${paths.length} imágenes generadas`,
    );
    if (!paths.some((p) => p)) {
      // Ninguna salió: probablemente budget o falla de la API.
      const first = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (first?.reason instanceof AIBudgetExceededError) {
        return NextResponse.json(
          { error: { code: "AI_BUDGET_EXCEEDED", message: "Servicio no disponible temporalmente." } },
          { status: 503 },
        );
      }
      throw first?.reason ?? new AILookImageError("No se pudieron generar las imágenes.");
    }

    await supabase
      .from("colorimetries")
      .update({ data: { ...colorimetry, lookImages: paths } })
      .eq("user_id", user.id);

    return NextResponse.json({ urls: await signPaths(supabase, paths) });
  } catch (err) {
    const message = err instanceof AILookImageError ? err.message : "No se pudieron generar las imágenes.";
    console.error(`[looklab] colorimetry looks: ${message}`);
    return NextResponse.json({ error: { code: "LOOKS_FAILED", message } }, { status: 500 });
  }
}
