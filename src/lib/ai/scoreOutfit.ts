import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, VISION_MODEL } from "./client";
import { buildScoringPrompt } from "./prompts/scoring.prompt";
import { ScoringResultSchema, type ScoringResult } from "./schema";
import type { FewShotExample } from "@/lib/scoring/knowledgeBase";
import type { AnalysisType, UserGender } from "@/types/domain";

export class AIScoringError extends Error {}

type ScoringContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "low" | "high" };

// Arma el contenido de usuario, inyectando ejemplos de referencia (few-shot) si
// los hay. Cada ejemplo lleva su veredicto humano + nota + imagen (detail "low"
// para gastar menos que la foto real). Sin ejemplos, es el pedido de siempre.
function buildScoringUserContent(
  photoUrl: string,
  occasionLabel: string,
  examples: FewShotExample[],
): ScoringContentPart[] {
  const content: ScoringContentPart[] = [];
  if (examples.length) {
    content.push({
      type: "input_text",
      text: `Antes de puntuar, mirá estos ejemplos de referencia ya evaluados por un experto para la ocasión "${occasionLabel}". Reflejan el nivel de exigencia esperado: un outfit inadecuado para la ocasión debe puntuar bajo aunque esté bien armado en sí mismo.`,
    });
    examples.forEach((ex, i) => {
      const verdictTxt = ex.verdict === "good" ? "ADECUADO ✓" : "NO ADECUADO ✗";
      content.push({
        type: "input_text",
        text: `Ejemplo ${i + 1} — ${verdictTxt} para "${occasionLabel}".${ex.note ? ` Nota del experto: "${ex.note}"` : ""}`,
      });
      content.push({ type: "input_image", image_url: ex.imageUrl, detail: "low" });
    });
    content.push({
      type: "input_text",
      text: "Ahora, con ese mismo criterio, analizá y puntuá la foto del usuario:",
    });
  } else {
    content.push({ type: "input_text", text: "Analizá y puntuá este outfit." });
  }
  content.push({ type: "input_image", image_url: photoUrl, detail: "high" });
  return content;
}

export async function scoreOutfit({
  photoUrl,
  occasionLabel,
  occasionVariant,
  occasionContext,
  analysisType,
  userGender,
  examples = [],
}: {
  photoUrl: string;
  occasionLabel: string;
  occasionVariant?: string | null;
  occasionContext?: string | null;
  analysisType: AnalysisType;
  userGender?: UserGender | null;
  examples?: FewShotExample[];
}): Promise<ScoringResult> {
  const response = await getOpenAIClient().responses.parse({
    model: VISION_MODEL,
    // temperature 0: el score debe ser consistente (se comparte). El mismo look
    // no puede dar 82 una vez y 74 la siguiente.
    temperature: 0,
    input: [
      { role: "system", content: buildScoringPrompt({ occasionLabel, occasionVariant, occasionContext, analysisType, userGender }) },
      { role: "user", content: buildScoringUserContent(photoUrl, occasionLabel, examples) },
    ],
    text: { format: zodTextFormat(ScoringResultSchema, "scoring_result") },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new AIScoringError("El modelo no devolvió un resultado de puntuación válido.");
  }
  return parsed;
}
