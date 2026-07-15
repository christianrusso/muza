import "server-only";
import { APIError, APIConnectionError, APIConnectionTimeoutError } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient, VISION_MODEL } from "./client";
import { buildScoringPrompt } from "./prompts/scoring.prompt";
import { ScoringResultSchema, type ScoringResult } from "./schema";
import { assertAiBudget } from "./budgetGuard";
import { logAiUsage } from "./usageLog";
import type { FewShotExample } from "@/lib/scoring/knowledgeBase";
import type { AnalysisType, UserGender } from "@/types/domain";

export class AIScoringError extends Error {}

// Presupuesto de la llamada a la IA. maxDuration del route = 60s (Vercel), así
// que 26s × 2 intentos + backoff (~52.5s) entra cómodo. Corta rápido para poder
// reintentar en vez de esperar el default del SDK (~10 min) o que Vercel mate la
// función a los 60s (que le daría al usuario el falso "foto inválida").
const TIMEOUT_MS = 26_000;
const MAX_ATTEMPTS = 2; // 1 intento + 1 reintento automático
const BACKOFF_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ¿El error es transitorio (vale la pena reintentar) o definitivo? Reintentamos
// timeouts, cortes de red, 429 (rate limit) y 5xx de OpenAI. Un 400 (pedido mal
// formado) NO se reintenta: fallaría igual. El parse vacío (AIScoringError) sí,
// suele ser un hipo del modelo.
function isTransient(err: unknown): boolean {
  if (err instanceof APIConnectionTimeoutError || err instanceof APIConnectionError) return true;
  if (err instanceof AIScoringError) return true;
  if (err instanceof APIError) {
    const s = err.status;
    return s === 408 || s === 409 || s === 429 || (typeof s === "number" && s >= 500);
  }
  return false;
}

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
  userId,
}: {
  photoUrl: string;
  occasionLabel: string;
  occasionVariant?: string | null;
  occasionContext?: string | null;
  analysisType: AnalysisType;
  userGender?: UserGender | null;
  examples?: FewShotExample[];
  userId?: string | null;
}): Promise<ScoringResult> {
  // Circuit breaker: corta antes de gastar si ya se pasó el tope diario/mensual.
  await assertAiBudget();

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await getOpenAIClient().responses.parse(
        {
          model: VISION_MODEL,
          // temperature 0: el score debe ser consistente (se comparte). El mismo
          // look no puede dar 82 una vez y 74 la siguiente.
          temperature: 0,
          input: [
            { role: "system", content: buildScoringPrompt({ occasionLabel, occasionVariant, occasionContext, analysisType, userGender }) },
            { role: "user", content: buildScoringUserContent(photoUrl, occasionLabel, examples) },
          ],
          text: { format: zodTextFormat(ScoringResultSchema, "scoring_result") },
        },
        // Timeout por intento; manejamos los reintentos acá (no el SDK) para
        // controlar el presupuesto total y el backoff.
        { timeout: TIMEOUT_MS, maxRetries: 0 },
      );

      // Registramos el gasto de cada respuesta recibida (ya se facturó, aunque el
      // parse venga vacío y reintentemos).
      await logAiUsage("score", response.usage, userId);

      const parsed = response.output_parsed;
      if (!parsed) {
        throw new AIScoringError("El modelo no devolvió un resultado de puntuación válido.");
      }
      return parsed;
    } catch (err) {
      lastErr = err;
      // Reintentamos una sola vez y solo ante fallas transitorias. Un error
      // definitivo (ej. 400) corta de inmediato para no quemar tiempo.
      if (attempt < MAX_ATTEMPTS && isTransient(err)) {
        await sleep(BACKOFF_MS);
        continue;
      }
      throw err;
    }
  }

  // Inalcanzable (el loop siempre retorna o lanza), pero deja el tipo prolijo.
  throw lastErr instanceof Error ? lastErr : new AIScoringError("Fallo de puntuación.");
}
