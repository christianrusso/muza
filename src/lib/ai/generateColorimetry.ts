import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, VISION_MODEL } from "./client";
import { buildColorimetryPrompt } from "./prompts/colorimetry.prompt";
import { ColorimetryResultSchema, type ColorimetryResult } from "./schema";
import { assertAiBudget } from "./budgetGuard";
import { logAiUsage } from "./usageLog";

export class AIColorimetryError extends Error {}

const TIMEOUT_MS = 40_000; // la salida es grande (paleta + textos); más aire que el scoring

// Genera la colorimetría a partir de la foto. Mismo patrón que scoreOutfit:
// budget guard → visión detail high → parse con Zod. Un reintento ante parse vacío.
export async function generateColorimetry(
  photoUrl: string,
  userId?: string | null,
): Promise<ColorimetryResult> {
  await assertAiBudget();

  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await getOpenAIClient().responses.parse(
      {
        model: VISION_MODEL,
        // temperature 0: la misma foto debería dar una paleta consistente (se guarda).
        temperature: 0,
        input: [
          { role: "system", content: buildColorimetryPrompt() },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Analizá la coloración de esta persona y armá su colorimetría." },
              { type: "input_image", image_url: photoUrl, detail: "high" },
            ],
          },
        ],
        text: { format: zodTextFormat(ColorimetryResultSchema, "colorimetry") },
      },
      { timeout: TIMEOUT_MS, maxRetries: 0 },
    );

    await logAiUsage("score", response.usage, userId);

    const parsed = response.output_parsed;
    if (parsed) return parsed;
    if (attempt === 2) {
      throw new AIColorimetryError("El modelo no devolvió una colorimetría válida.");
    }
  }

  // Inalcanzable.
  throw new AIColorimetryError("Fallo de generación de colorimetría.");
}
