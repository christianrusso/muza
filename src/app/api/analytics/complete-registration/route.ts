import { NextResponse } from "next/server";
import { sendMetaCapiEvent } from "@/lib/metaConversionsApi";
import { sendTikTokEvent } from "@/lib/tiktokEventsApi";

// Llamado desde el cliente justo después de un registro por email/contraseña
// exitoso (ver (auth)/register/page.tsx). Server-side porque Conversions API
// (Meta) y Events API (TikTok) necesitan correr en el servidor; los pixels de
// navegador (fbq/ttq) se disparan en paralelo con los mismos eventId para que
// cada plataforma dedupe su propio par cliente/servidor.
export async function POST(request: Request) {
  try {
    const { email, metaEventId, tiktokEventId } = (await request.json()) as {
      email?: string;
      metaEventId?: string;
      tiktokEventId?: string;
    };

    if (!metaEventId && !tiktokEventId) {
      return NextResponse.json({ error: "metaEventId o tiktokEventId requerido" }, { status: 400 });
    }

    const { origin } = new URL(request.url);
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent");

    await Promise.all([
      metaEventId
        ? sendMetaCapiEvent({
            eventName: "CompleteRegistration",
            eventId: metaEventId,
            eventSourceUrl: `${origin}/register`,
            email,
            clientIp,
            userAgent,
          })
        : Promise.resolve(),
      tiktokEventId
        ? sendTikTokEvent({
            eventName: "CompleteRegistration",
            eventId: tiktokEventId,
            eventSourceUrl: `${origin}/register`,
            email,
            clientIp,
            userAgent,
          })
        : Promise.resolve(),
    ]);
  } catch {
    // no-op: nunca romper el flujo de registro por un fallo de tracking
  }

  return NextResponse.json({ ok: true });
}
