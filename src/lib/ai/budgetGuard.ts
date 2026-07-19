import "server-only";
import { serviceDb } from "@/lib/serviceDb";

// Se lanza cuando el gasto del día/mes ya superó el tope. Los routes la traducen
// a un 503 con mensaje amable (no un 500/502 crudo).
export class AIBudgetExceededError extends Error {}

/**
 * Circuit breaker: corta ANTES de llamar a OpenAI si el gasto acumulado del día
 * o del mes cruzó AI_DAILY_BUDGET_USD / AI_MONTHLY_BUDGET_USD.
 *
 * Fail-open: si el chequeo falla por infra (tabla/función aún no migrada, DB
 * caída, etc.) NO bloquea al usuario legítimo — solo el exceso confirmado corta.
 */
export async function assertAiBudget(): Promise<void> {
  const dailyCap = Number(process.env.AI_DAILY_BUDGET_USD ?? 20);
  const monthlyCap = Number(process.env.AI_MONTHLY_BUDGET_USD ?? 300);

  let daySpend = 0;
  let monthSpend = 0;
  try {
    const { data, error } = await serviceDb().rpc("ai_spend_summary");
    if (error) return; // fail-open
    const row = Array.isArray(data) ? data[0] : data;
    daySpend = Number(row?.day_spend ?? 0);
    monthSpend = Number(row?.month_spend ?? 0);
  } catch {
    return; // fail-open
  }

  // TODO (alerta): cuando definamos canal (Slack/email), avisar acá al cruzar el
  // 80% del tope (daySpend >= dailyCap*0.8 || monthSpend >= monthlyCap*0.8),
  // ANTES del corte. Por ahora solo cortamos al 100%.

  if (daySpend >= dailyCap || monthSpend >= monthlyCap) {
    throw new AIBudgetExceededError("Presupuesto de IA agotado por ahora.");
  }
}
