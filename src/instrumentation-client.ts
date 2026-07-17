// Inicialización de PostHog (analítica de comportamiento: pageviews, flujo entre
// pantallas, tiempo por pantalla, session replay). Corre en el cliente después
// de cargar el HTML y antes de la hidratación.
//
// Si no hay NEXT_PUBLIC_POSTHOG_KEY (dev local sin configurar, o si algún día se
// desactiva), no inicializa nada: la app funciona igual, sin analítica.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

if (key) {
  posthog.init(key, {
    api_host: host,
    // El App Router hace navegaciones "soft" que el autocapture de historial de
    // PostHog no siempre detecta; capturamos los pageviews a mano vía
    // onRouterTransitionStart (abajo) + el pageview inicial acá.
    capture_pageview: false,
    capture_pageleave: true, // necesario para tiempo-en-pantalla y bounce
    // LookLab sube fotos de personas: no grabamos session replay para no
    // capturar caras ni contenido sensible. Solo métricas de eventos.
    disable_session_recording: true,
    defaults: "2025-05-24",
  });

  // Pageview de la carga inicial (onRouterTransitionStart solo cubre las
  // navegaciones posteriores).
  posthog.capture("$pageview");
}

// Next llama a esto al empezar cada navegación del cliente. La URL destino
// todavía no está en window.location, así que la pasamos explícita.
export function onRouterTransitionStart(url: string) {
  if (!key) return;
  try {
    // Next pasa `url` como URL absoluta, así que concatenar el origin la
    // duplicaba ("https://looklab.iohttps://looklab.io/home"). new URL la
    // resuelve bien venga absoluta o relativa, y rompe todo análisis por URL si
    // no se hace así.
    posthog.capture("$pageview", { $current_url: new URL(url, window.location.origin).href });
  } catch {
    // Nunca romper la navegación por un fallo de tracking.
  }
}
