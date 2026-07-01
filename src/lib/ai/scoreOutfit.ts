import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, VISION_MODEL } from "./client";
import { buildScoringPrompt } from "./prompts/scoring.prompt";
import { ScoringResultSchema, type ScoringResult } from "./schema";
import type { AnalysisType } from "@/types/domain";

export class AIScoringError extends Error {}

export async function scoreOutfit({
  photoUrl,
  occasionLabel,
  analysisType,
}: {
  photoUrl: string;
  occasionLabel: string;
  analysisType: AnalysisType;
}): Promise<ScoringResult> {
  const response = await getOpenAIClient().responses.parse({
    model: VISION_MODEL,
    input: [
      { role: "system", content: buildScoringPrompt({ occasionLabel, analysisType }) },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Analizá y puntuá este outfit." },
          { type: "input_image", image_url: photoUrl, detail: "high" },
        ],
      },
    ],
    text: { format: zodTextFormat(ScoringResultSchema, "scoring_result") },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new AIScoringError("El modelo no devolvió un resultado de puntuación válido.");
  }
  return parsed;
}
