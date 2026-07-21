import "server-only";
import { assertAiBudget } from "./budgetGuard";
import type { Colorimetry } from "@/types/colorimetry";

export class AILookImageError extends Error {}

// Gemini genera las imágenes de looks; OpenAI sigue con el análisis de texto. Se
// usa el modelo de imagen nativo (Nano Banana) vía generateContent —Imagen por
// :predict quedó deprecado para cuentas nuevas. REST, sin SDK. Config:
//   GEMINI_API_KEY        — clave de Google AI Studio (obligatoria)
//   GEMINI_IMAGE_MODEL    — default gemini-2.5-flash-image
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

// Arma el prompt de un look: prendas planas (flat-lay) sobre fondo neutro, en los
// colores de la paleta. SIN personas —evita lo uncanny y el tema de identidad.
function buildLookImagePrompt(lookName: string, c: Colorimetry): string {
  const colors = c.bestColors.map((s) => `${s.name} (${s.hex})`).join(", ");
  return `Vertical (portrait 3:4) fashion flat-lay outfit for "${lookName}". Clothing pieces neatly arranged on a plain light neutral background (no person, no mannequin, no face). Editorial, soft even lighting, top-down view. Use ONLY this color palette: ${colors}. Cohesive, elegant, realistic garments.`;
}

// Genera UN look como imagen. Devuelve los bytes PNG (Gemini los manda en base64
// dentro de inlineData).
export async function generateLookImage(lookName: string, colorimetry: Colorimetry): Promise<Buffer> {
  await assertAiBudget();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AILookImageError("Falta GEMINI_API_KEY.");
  }

  const prompt = buildLookImagePrompt(lookName, colorimetry);
  // Log de debug: exactamente qué se le manda a Gemini (borrar después).
  console.log(`[looklab] Gemini request → modelo=${GEMINI_IMAGE_MODEL}\n  prompt: ${prompt}`);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AILookImageError(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
  };
  const b64 = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) {
    // Sin imagen suele ser el filtro de seguridad.
    throw new AILookImageError("Gemini no devolvió imagen (posible filtro de seguridad).");
  }
  return Buffer.from(b64, "base64");
}
