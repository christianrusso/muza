import "server-only";
import { assertAiBudget } from "./budgetGuard";
import type { Colorimetry } from "@/types/colorimetry";

export class AILookImageError extends Error {}

// Gemini (Imagen) genera las imágenes de looks; OpenAI sigue haciendo el análisis
// de texto. Imagen acepta aspect ratio 3:4 nativo (el de las tarjetas). Se llama
// por REST (sin SDK). Config:
//   GEMINI_API_KEY        — clave de Google AI Studio (obligatoria)
//   GEMINI_IMAGE_MODEL    — default imagen-3.0-generate-002
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "imagen-3.0-generate-002";

// Arma el prompt de un look: prendas planas (flat-lay) sobre fondo neutro, en los
// colores de la paleta. SIN personas —evita lo uncanny y el tema de identidad.
function buildLookImagePrompt(lookName: string, c: Colorimetry): string {
  const colors = c.bestColors.map((s) => `${s.name} (${s.hex})`).join(", ");
  return `Fashion flat-lay outfit for "${lookName}". Clothing pieces neatly arranged on a plain light neutral background (no person, no mannequin, no face). Editorial, soft even lighting, top-down view. Use ONLY this color palette: ${colors}. Cohesive, elegant, realistic garments.`;
}

// Genera UN look como imagen. Devuelve los bytes PNG (Imagen devuelve base64).
export async function generateLookImage(lookName: string, colorimetry: Colorimetry): Promise<Buffer> {
  await assertAiBudget();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AILookImageError("Falta GEMINI_API_KEY.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:predict`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        instances: [{ prompt: buildLookImagePrompt(lookName, colorimetry) }],
        parameters: { sampleCount: 1, aspectRatio: "3:4" },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AILookImageError(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    predictions?: { bytesBase64Encoded?: string }[];
  };
  const b64 = json.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    // Sin imagen suele ser el filtro de seguridad de Imagen.
    throw new AILookImageError("Gemini no devolvió imagen (posible filtro de seguridad).");
  }
  return Buffer.from(b64, "base64");
}
