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
  // Modo invitado (el tramo ANTES del registro, hasta ahora invisible). El
  // denominador sale del $pageview que PostHog captura solo, así que acá solo
  // hacen falta el muro y la conversión.
  //   guest_wall_hit   — el invitado tocó una acción que exige cuenta. La
  //                      propiedad `action` es la que dice qué muro convierte.
  //   guest_converted  — se registró viniendo de un muro, con qué muro fue y
  //                      cuánto tardó.
  | "guest_wall_hit"
  | "guest_converted"
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

// ===== Atribución del modo invitado =====
// De qué muro salió el que se está por registrar. sessionStorage y no un query
// param: no ensucia la URL y muere con la pestaña, que es justo lo que queremos.
const GUEST_WALL_KEY = "looklab:guest_wall";

interface GuestWallMark {
  action: string;
  at: number;
}

/** Marca que el invitado tocó un muro, para poder atribuir la conversión después. */
export function markGuestWall(action: string) {
  try {
    const mark: GuestWallMark = { action, at: Date.now() };
    sessionStorage.setItem(GUEST_WALL_KEY, JSON.stringify(mark));
  } catch {
    // Safari en privado puede tirar acá. Solo se pierde la atribución; el muro
    // y el registro funcionan igual.
  }
}

/**
 * Si el que acaba de autenticarse venía de un muro, emite guest_converted (una
 * sola vez: la marca se consume). Lo llama AnalyticsIdentify, que ve todos los
 * caminos de entrada — email, OAuth y recargas.
 */
export function trackGuestConversion() {
  try {
    const raw = sessionStorage.getItem(GUEST_WALL_KEY);
    if (!raw) return;
    sessionStorage.removeItem(GUEST_WALL_KEY);
    const mark = JSON.parse(raw) as GuestWallMark;
    track("guest_converted", {
      action: mark.action,
      seconds_to_convert: Math.round((Date.now() - mark.at) / 1000),
    });
  } catch {
    // no-op
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
