"use client";

/**
 * CompleteRegistration de Meta y TikTok, el evento con el que las dos
 * plataformas atribuyen las altas a sus campañas. Vive acá y no en el
 * formulario porque hay dos caminos de alta que tienen que emitirlo igual: el
 * registro por password ((auth)/register) y el retorno de OAuth
 * (AnalyticsIdentify).
 *
 * Cada plataforma recibe el mismo eventId por el pixel del navegador y por su
 * API server-side, para que dedupe su propio par cliente/servidor.
 *
 * @param sourcePath Ruta desde la que se registró, para el eventSourceUrl que
 *   reportamos a cada plataforma. Relativa y arrancando con "/".
 */
export function trackCompleteRegistration({
  email,
  sourcePath,
}: {
  email?: string;
  sourcePath: string;
}) {
  try {
    const metaEventId = crypto.randomUUID();
    const tiktokEventId = crypto.randomUUID();
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", {}, { eventID: metaEventId });
    }
    if (typeof window !== "undefined" && window.ttq) {
      window.ttq.track("CompleteRegistration", {}, { event_id: tiktokEventId });
    }
    fetch("/api/analytics/complete-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, metaEventId, tiktokEventId, sourcePath }),
    }).catch(() => {
      // no-op: nunca romper el flujo de registro por un fallo de tracking
    });
  } catch {
    // no-op
  }
}
