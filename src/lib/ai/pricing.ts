import "server-only";

// Tarifa de gpt-4o en USD por 1M de tokens (vigente al escribir esto). Se
// actualiza el día que OpenAI cambie el precio; overrideable por env para
// ajustar sin deploy. NO hardcodear el número en medio del código de negocio.
const INPUT_PER_1M = Number(process.env.AI_PRICE_INPUT_PER_1M ?? 2.5);
const OUTPUT_PER_1M = Number(process.env.AI_PRICE_OUTPUT_PER_1M ?? 10);

/** Costo estimado de una llamada según tokens de entrada/salida. */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_PER_1M + (outputTokens / 1_000_000) * OUTPUT_PER_1M;
}
