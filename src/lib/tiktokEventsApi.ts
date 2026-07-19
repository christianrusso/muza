import "server-only";
import { createHash } from "node:crypto";

// Envío server-side a TikTok Events API. Complementa al TikTok Pixel del
// navegador (src/components/analytics/TikTokPixel.tsx) — mismo criterio que
// metaConversionsApi.ts: nunca rompe el flujo del usuario si falla.
//
// Sin TIKTOK_EVENTS_API_ACCESS_TOKEN o NEXT_PUBLIC_TIKTOK_PIXEL_ID
// configurados (dev local), no hace nada.

const PIXEL_CODE = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
const ACCESS_TOKEN = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
const EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type TikTokEventName = "CompleteRegistration";

interface SendTikTokEventParams {
  eventName: TikTokEventName;
  /** Mismo eventId que ttq.track() en el navegador, para que TikTok dedupe. */
  eventId: string;
  eventSourceUrl: string;
  email?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export async function sendTikTokEvent({
  eventName,
  eventId,
  eventSourceUrl,
  email,
  clientIp,
  userAgent,
}: SendTikTokEventParams): Promise<void> {
  if (!PIXEL_CODE || !ACCESS_TOKEN) return;

  try {
    const user: Record<string, unknown> = {};
    if (email) user.email = sha256(email);
    if (clientIp) user.ip = clientIp;
    if (userAgent) user.user_agent = userAgent;

    const res = await fetch(EVENTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": ACCESS_TOKEN,
      },
      body: JSON.stringify({
        pixel_code: PIXEL_CODE,
        event: eventName,
        event_id: eventId,
        timestamp: new Date().toISOString(),
        context: {
          page: { url: eventSourceUrl },
          user,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[tiktokEventsApi] ${eventName} falló (${res.status}): ${body}`);
    }
  } catch (err) {
    // no-op: un fallo de tracking nunca debe romper el flujo del usuario
    console.warn(`[tiktokEventsApi] ${eventName} falló:`, err);
  }
}
