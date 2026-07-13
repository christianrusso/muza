"use client";

import posthog from "posthog-js";

/**
 * Eventos del embudo de activación (roadmap, sección 6). Envolver siempre en
 * try/catch: un fallo de analítica nunca debe romper el flujo del usuario.
 */
export type FunnelEvent =
  // Adquisición / entrada
  | "signed_up"
  | "logged_in"
  | "onboarding_completed"
  // Activación (embudo principal)
  | "occasion_selected"
  | "photo"
  | "validation"
  | "score_viewed"
  | "shared"
  | "published"
  | "voted"
  | "followed";

export function track(event: FunnelEvent, properties?: Record<string, unknown>) {
  try {
    posthog.capture(event, properties);
  } catch {
    // no-op: nunca romper la UI por un fallo de tracking
  }
}

/**
 * Asocia la persona anónima de PostHog con el usuario real (Supabase user id).
 * Cose la sesión previa al login con la identificada y habilita retención
 * D1/D7/D30 y el embudo deduplicado por persona real. Se llama desde
 * AnalyticsIdentify (auth-state) para cubrir email, OAuth y recargas.
 */
export function identify(distinctId: string, properties?: Record<string, unknown>) {
  try {
    posthog.identify(distinctId, properties);
  } catch {
    // no-op
  }
}

/** Al cerrar sesión: corta la asociación para no mezclar al próximo usuario. */
export function resetAnalytics() {
  try {
    posthog.reset();
  } catch {
    // no-op
  }
}
