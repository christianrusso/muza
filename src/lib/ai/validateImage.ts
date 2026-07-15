import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, VISION_MODEL } from "./client";
import { buildValidationPrompt } from "./prompts/validation.prompt";
import { ValidationResultSchema, type ValidationResult } from "./schema";
import { assertAiBudget } from "./budgetGuard";
import { logAiUsage } from "./usageLog";

export class AIValidationError extends Error {}

export async function validateOutfitImage(
  photoUrl: string,
  userId?: string | null,
): Promise<ValidationResult> {
  // Circuit breaker: corta antes de gastar si ya se pasó el tope diario/mensual.
  await assertAiBudget();

  const response = await getOpenAIClient().responses.parse({
    model: VISION_MODEL,
    // temperature 0: la validación debe ser determinística (la misma foto no puede
    // pasar una vez y ser rechazada la siguiente).
    temperature: 0,
    input: [
      { role: "system", content: buildValidationPrompt() },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Validá esta foto de outfit." },
          { type: "input_image", image_url: photoUrl, detail: "high" },
        ],
      },
    ],
    text: { format: zodTextFormat(ValidationResultSchema, "validation_result") },
  });

  await logAiUsage("validate", response.usage, userId);

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new AIValidationError("El modelo no devolvió un resultado de validación válido.");
  }
  return parsed;
}
