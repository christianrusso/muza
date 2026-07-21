import "server-only";
import { getOpenAIClient, IMAGE_MODEL } from "./client";
import { assertAiBudget } from "./budgetGuard";
import type { Colorimetry } from "@/types/colorimetry";

export class AILookImageError extends Error {}

// Arma el prompt de un look: prendas planas (flat-lay) sobre fondo neutro, en los
// colores de la paleta. SIN personas —evita lo uncanny y el tema de identidad.
function buildLookImagePrompt(lookName: string, c: Colorimetry): string {
  const colors = c.bestColors.map((s) => `${s.name} (${s.hex})`).join(", ");
  return `Fashion flat-lay outfit for "${lookName}". Clothing pieces neatly arranged on a plain light neutral background (no person, no mannequin, no face). Editorial, soft even lighting, top-down view. Use ONLY this color palette: ${colors}. Cohesive, elegant, realistic garments.`;
}

// Genera UN look como imagen. Devuelve los bytes PNG. gpt-image-1 devuelve b64.
// Tamaño vertical (~2:3) para las tarjetas 3:4 del resultado.
export async function generateLookImage(lookName: string, colorimetry: Colorimetry): Promise<Buffer> {
  await assertAiBudget();

  const response = await getOpenAIClient().images.generate({
    model: IMAGE_MODEL,
    prompt: buildLookImagePrompt(lookName, colorimetry),
    size: "1024x1536",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new AILookImageError("El modelo no devolvió una imagen.");
  }
  return Buffer.from(b64, "base64");
}
