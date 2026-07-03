import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface FewShotExample {
  imageUrl: string;
  verdict: "good" | "bad";
  note: string | null;
}

// El few-shot en scoring está APAGADO por defecto. Se prende con
// SCORING_FEWSHOT_ENABLED=true recién cuando el banco (tabla scoring_examples)
// tenga volumen suficiente. Con el flag apagado, el scoring se comporta igual
// que siempre (sin ejemplos).
export function isFewShotEnabled(): boolean {
  return process.env.SCORING_FEWSHOT_ENABLED === "true";
}

// Bucket de storage donde viven las imágenes de referencia. Por defecto reusa el
// de las fotos de usuario; se puede apuntar a uno dedicado con env.
const EXAMPLES_BUCKET = process.env.SCORING_EXAMPLES_BUCKET ?? "scoring-examples";
const DEFAULT_MAX = Number(process.env.SCORING_FEWSHOT_MAX ?? 4);
const SIGNED_URL_TTL = 300; // segundos, igual que la foto del usuario

// Trae ejemplos curados para una ocasión, con signed URLs listas para pasarle a
// OpenAI. Devuelve [] si el few-shot está apagado o no hay ejemplos, de modo que
// el scoring cae al comportamiento actual sin romperse.
export async function getFewShotExamples(
  supabase: SupabaseServerClient,
  occasionId: string,
  max: number = DEFAULT_MAX,
): Promise<FewShotExample[]> {
  if (!isFewShotEnabled()) return [];

  const { data, error } = await supabase
    .from("scoring_examples")
    .select("photo_path, verdict, note")
    .eq("occasion_id", occasionId)
    .eq("active", true)
    .limit(50); // pool amplio; el balanceo 👍/👎 se hace en código

  if (error || !data?.length) return [];

  // Balancear 👍/👎 (mitad y mitad) antes de firmar URLs. Si no, una ocasión con
  // el banco cargado hacia un lado (ej. gym con muchos 👎) sesga al modelo a
  // sobre-castigar. Se firman URLs solo para los ejemplos elegidos.
  const good = data.filter((r) => r.verdict === "good");
  const bad = data.filter((r) => r.verdict === "bad");
  const half = Math.floor(max / 2);
  const picked = [...good.slice(0, half), ...bad.slice(0, max - half)];
  if (picked.length < max) {
    const rest = [...good.slice(half), ...bad.slice(max - half)];
    picked.push(...rest.slice(0, max - picked.length));
  }

  const examples: FewShotExample[] = [];
  for (const row of picked) {
    const { data: signed } = await supabase.storage
      .from(EXAMPLES_BUCKET)
      .createSignedUrl(row.photo_path, SIGNED_URL_TTL);
    if (signed?.signedUrl) {
      examples.push({ imageUrl: signed.signedUrl, verdict: row.verdict, note: row.note });
    }
  }
  return examples;
}
