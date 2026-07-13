"use client";

import posthog from "posthog-js";

/**
 * Eventos del embudo de activación (roadmap, sección 6). Envolver siempre en
 * try/catch: un fallo de analítica nunca debe romper el flujo del usuario.
 */
export type FunnelEvent =
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
