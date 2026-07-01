import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, VISION_MODEL } from "./client";
import { buildValidationPrompt } from "./prompts/validation.prompt";
import { ValidationResultSchema, type ValidationResult } from "./schema";

export class AIValidationError extends Error {}

export async function validateOutfitImage(photoUrl: string): Promise<ValidationResult> {
  const response = await getOpenAIClient().responses.parse({
    model: VISION_MODEL,
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

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new AIValidationError("El modelo no devolvió un resultado de validación válido.");
  }
  return parsed;
}
