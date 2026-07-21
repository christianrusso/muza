import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, VISION_MODEL } from "./client";
import { buildColorimetryValidationPrompt } from "./prompts/colorimetryValidation.prompt";
import { ColorimetryValidationResultSchema, type ColorimetryValidationResult } from "./schema";
import { assertAiBudget } from "./budgetGuard";
import { logAiUsage } from "./usageLog";

export class AIColorimetryValidationError extends Error {}

// Valida que la foto sirva para leer la coloración (ver prompt). Mismo patrón que
// validateOutfitImage: budget guard → visión detail high → parse con Zod.
export async function validateColorimetryPhoto(
  photoUrl: string,
  userId?: string | null,
): Promise<ColorimetryValidationResult> {
  await assertAiBudget();

  const response = await getOpenAIClient().responses.parse({
    model: VISION_MODEL,
    // temperature 0: la misma foto no puede pasar una vez y ser rechazada la
    // siguiente.
    temperature: 0,
    input: [
      { role: "system", content: buildColorimetryValidationPrompt() },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Validá esta foto para el análisis de colorimetría." },
          { type: "input_image", image_url: photoUrl, detail: "high" },
        ],
      },
    ],
    text: { format: zodTextFormat(ColorimetryValidationResultSchema, "colorimetry_validation") },
  });

  await logAiUsage("validate", response.usage, userId);

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new AIColorimetryValidationError("El modelo no devolvió un resultado de validación válido.");
  }
  return parsed;
}
