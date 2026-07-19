import "server-only";
import { createHash } from "node:crypto";

// Envío server-side a Meta Conversions API (CAPI). Complementa al Meta Pixel
// del navegador (src/components/analytics/MetaPixel.tsx): el pixel puede
// perderse por ad-blockers o Safari ITP, esto no. Mismo criterio que el resto
// de la analítica del repo: nunca rompe el flujo del usuario si falla.
//
// Sin META_CONVERSIONS_API_ACCESS_TOKEN o NEXT_PUBLIC_META_PIXEL_ID
// configurados (dev local), no hace nada.

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
const GRAPH_API_VERSION = "v21.0";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type MetaCapiEventName = "CompleteRegistration";

interface SendMetaCapiEventParams {
  eventName: MetaCapiEventName;
  /** Mismo eventId que se usa en el fbq() del navegador, para que Meta dedupe. */
  eventId: string;
  eventSourceUrl: string;
  email?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  email,
  clientIp,
  userAgent,
}: SendMetaCapiEventParams): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) return;

  try {
    const userData: Record<string, unknown> = {};
    if (email) userData.em = [sha256(email)];
    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              action_source: "website",
              event_source_url: eventSourceUrl,
              user_data: userData,
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[metaConversionsApi] ${eventName} falló (${res.status}): ${body}`);
    }
  } catch (err) {
    // no-op: un fallo de tracking nunca debe romper el flujo del usuario
    console.warn(`[metaConversionsApi] ${eventName} falló:`, err);
  }
}
