import { NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { generateFlatlayImage, AILookImageError } from "@/lib/ai/generateLookImage";
import { AIBudgetExceededError } from "@/lib/ai/budgetGuard";
import { isDemoMode } from "@/lib/demo";
import type { Colorimetry } from "@/types/colorimetry";

// Genera UNA imagen (flat-lay) de un look o de un grupo de outfit, on-demand.
// Reemplaza la generación de los 4 looks de una: ahora se paga por lo que el
// usuario realmente mira (Básicos al abrir, el resto al tocar).
export const maxDuration = 60;
const BUCKET = "colorimetry-photos";
const SIGNED_TTL = 600;

const BodySchema = z.object({
  target: z.enum(["look", "outfit", "custom"]),
  key: z.string().min(1).max(200), // look: índice; outfit: id del grupo; custom: texto de la ocasión
});

export async function POST(request: Request) {
  const body = BodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: { code: "INVALID_BODY", message: "Datos inválidos." } }, { status: 400 });
  }
  const { target, key } = body.data;

  if (isDemoMode()) {
    return NextResponse.json({ url: null });
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
  const c = row.data as unknown as Colorimetry;

  // Resolver el "subject" (qué dibujar) y si ya existe la imagen.
  let subject: string;
  let existing: string | undefined;
  let lookIdx = -1;
  if (target === "look") {
    lookIdx = Number(key);
    if (!Number.isInteger(lookIdx) || lookIdx < 0 || lookIdx >= c.looks.length) {
      return NextResponse.json({ error: { code: "BAD_KEY", message: "Look inválido." } }, { status: 400 });
    }
    subject = c.looks[lookIdx];
    existing = c.lookImages?.[lookIdx] || undefined;
  } else if (target === "outfit") {
    const group = c.outfitGroups.find((g) => g.id === key);
    if (!group) {
      return NextResponse.json({ error: { code: "BAD_KEY", message: "Grupo inválido." } }, { status: 400 });
    }
    subject = group.items.join(", ");
    existing = c.outfitImages?.[key] || undefined;
  } else {
    // custom: la ocasión que describió el usuario ES el subject. Se regenera cada
    // vez (no hay idempotencia: la idea es que pruebe distintas ocasiones).
    subject = key.trim();
  }

  // Idempotente (look/outfit): si ya está, la firmamos y listo.
  if (existing) {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(existing, SIGNED_TTL);
    return NextResponse.json({ url: signed?.signedUrl ?? null });
  }

  // Género declarado (sin esto el modelo tira a moda femenina).
  const { data: profile } = await supabase.from("profiles").select("gender").eq("id", user.id).single();

  try {
    const png = await generateFlatlayImage(subject, c, profile?.gender ?? null);
    // Gemini devuelve PNG ~1.8MB. Re-encode a WebP (~10x más liviano) para no
    // inflar storage ni el ancho de banda del usuario; calidad visual intacta.
    const webp = await sharp(png)
      .resize(1080, 1440, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const path = `${user.id}/colorimetry-imgs/${crypto.randomUUID()}.webp`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, webp, { contentType: "image/webp" });
    if (upErr) throw upErr;

    // Guardar el path en el slot correcto, preservando el resto del objeto.
    const next: Colorimetry = { ...c };
    if (target === "look") {
      const arr = (c.lookImages ?? c.looks.map(() => "")).slice();
      while (arr.length < c.looks.length) arr.push("");
      arr[lookIdx] = path;
      next.lookImages = arr;
    } else if (target === "outfit") {
      next.outfitImages = { ...(c.outfitImages ?? {}), [key]: path };
    } else {
      next.customLook = { occasion: subject, imagePath: path };
    }
    await supabase.from("colorimetries").update({ data: next }).eq("user_id", user.id);

    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
    return NextResponse.json({ url: signed?.signedUrl ?? null });
  } catch (err) {
    if (err instanceof AIBudgetExceededError) {
      return NextResponse.json(
        { error: { code: "AI_BUDGET_EXCEEDED", message: "Servicio no disponible temporalmente." } },
        { status: 503 },
      );
    }
    const message = err instanceof AILookImageError ? err.message : "No se pudo generar la imagen.";
    console.error(`[looklab] colorimetry image (${target}:${key}): ${message}`);
    return NextResponse.json({ error: { code: "IMAGE_FAILED", message } }, { status: 500 });
  }
}
