import "server-only";
import { serviceDb } from "@/lib/serviceDb";
import { estimateCostUsd } from "./pricing";

// Forma mínima de ResponseUsage que nos interesa (openai SDK). El resto se ignora.
type Usage = { input_tokens?: number; output_tokens?: number } | null | undefined;

/**
 * Registra el gasto de una llamada a OpenAI en ai_usage_log. NUNCA lanza: un
 * fallo de logging no puede romper la validación/scoring del usuario. Alimenta
 * el circuit breaker (budgetGuard).
 */
export async function logAiUsage(
  endpoint: "validate" | "score",
  usage: Usage,
  userId?: string | null,
): Promise<void> {
  try {
    const input = usage?.input_tokens ?? 0;
    const output = usage?.output_tokens ?? 0;
    await serviceDb()
      .from("ai_usage_log")
      .insert({
        user_id: userId ?? null,
        endpoint,
        input_tokens: input,
        output_tokens: output,
        estimated_cost_usd: estimateCostUsd(input, output),
      });
  } catch {
    // no-op: el registro es best-effort.
  }
}
