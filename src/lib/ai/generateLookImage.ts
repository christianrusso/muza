import "server-only";
import { assertAiBudget } from "./budgetGuard";
import type { Colorimetry } from "@/types/colorimetry";
import type { UserGender } from "@/types/domain";

export class AILookImageError extends Error {}

// El modelo de imagen, sin indicación, tira a moda femenina. Se lo fija según el
// género declarado; "no_especifica"/null → unisex.
function genderPhrase(gender?: UserGender | null): string {
  if (gender === "masculino") return "menswear (men's) ";
  if (gender === "femenino") return "womenswear (women's) ";
  return "unisex ";
}

// Gemini genera las imágenes de looks; OpenAI sigue con el análisis de texto. Se
// usa el modelo de imagen nativo (Nano Banana) vía generateContent —Imagen por
// :predict quedó deprecado para cuentas nuevas. REST, sin SDK. Config:
//   GEMINI_API_KEY        — clave de Google AI Studio (obligatoria)
//   GEMINI_IMAGE_MODEL    — default gemini-2.5-flash-image
const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";

// Arma el prompt de un flat-lay. `subject` es el tema: el nombre de un look
// ("Oficina otoñal") o la lista de prendas de un grupo ("Camisa terracota,
// Pantalón oliva"). Prendas planas sobre fondo neutro, en la paleta, SIN personas.
function buildFlatlayPrompt(subject: string, c: Colorimetry, gender?: UserGender | null): string {
  const colors = c.bestColors.map((s) => `${s.name} (${s.hex})`).join(", ");
  return `Vertical (portrait 3:4) ${genderPhrase(gender)}fashion flat-lay outfit — ${subject}. Clothing pieces neatly arranged on a plain light neutral background (no person, no mannequin, no face). Editorial, soft even lighting, top-down view. Use ONLY this color palette: ${colors}. Cohesive, elegant, realistic garments.`;
}

// Genera UN flat-lay como imagen. Devuelve los bytes PNG (Gemini los manda en
// base64 dentro de inlineData).
export async function generateFlatlayImage(
  subject: string,
  colorimetry: Colorimetry,
  gender?: UserGender | null,
): Promise<Buffer> {
  await assertAiBudget();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AILookImageError("Falta GEMINI_API_KEY.");
  }

  const prompt = buildFlatlayPrompt(subject, colorimetry, gender);
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
