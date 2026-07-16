import { NextResponse } from "next/server";
import { sendMetaCapiEvent } from "@/lib/metaConversionsApi";

// Llamado desde el cliente justo después de un registro por email/contraseña
// exitoso (ver (auth)/register/page.tsx). Server-side porque Conversions API
// necesita correr en el servidor; el fbq() del navegador se dispara en
// paralelo con el mismo eventId para que Meta dedupe ambos envíos.
export async function POST(request: Request) {
  try {
    const { email, eventId } = (await request.json()) as {
      email?: string;
      eventId?: string;
    };

    if (!eventId) {
      return NextResponse.json({ error: "eventId requerido" }, { status: 400 });
    }

    const { origin } = new URL(request.url);
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    await sendMetaCapiEvent({
      eventName: "CompleteRegistration",
      eventId,
      eventSourceUrl: `${origin}/register`,
      email,
      clientIp,
      userAgent: request.headers.get("user-agent"),
    });
  } catch {
    // no-op: nunca romper el flujo de registro por un fallo de tracking
  }

  return NextResponse.json({ ok: true });
}
