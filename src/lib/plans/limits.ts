import type { PlanTier } from "@/types/domain";

// Business-finalized values are still pending (see spec section 5, "Modelo de
// monetización" — X/Y/Z marked as TBD). These are the single place to edit
// once pricing/limits are confirmed; nothing else should hardcode them.
export const FREE_MONTHLY_ANALYSES_LIMIT = 5; // "Y análisis por mes" — placeholder
export const FREE_HISTORY_WINDOW_DAYS = 30;
export const FREE_LIFETIME_SIMULATIONS = 0; // reserved for the (out-of-scope) Simulación IA feature
export const PRO_MONTHLY_PRICE_USD_PLACEHOLDER = 0; // "USD Z por mes" — placeholder

export interface PlanLimits {
  monthlyAnalyses: number | null; // null = unlimited
  historyWindowDays: number | null; // null = unlimited
  canSimulate: boolean;
  simulationsLifetime: number | null;
  advancedRecommendations: boolean;
  processingPriority: "standard" | "high";
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    // LANZAMIENTO GRATIS (2026-07): sin tope de análisis ni recorte de historial
    // hasta activar la monetización. Revertir a FREE_MONTHLY_ANALYSES_LIMIT /
    // FREE_HISTORY_WINDOW_DAYS cuando se prenda el pago.
    monthlyAnalyses: null,
    historyWindowDays: null,
    canSimulate: false,
    simulationsLifetime: FREE_LIFETIME_SIMULATIONS,
    advancedRecommendations: false,
    processingPriority: "standard",
  },
  pro: {
    monthlyAnalyses: null,
    historyWindowDays: null,
    canSimulate: true,
    simulationsLifetime: null,
    advancedRecommendations: true,
    processingPriority: "high",
  },
};
