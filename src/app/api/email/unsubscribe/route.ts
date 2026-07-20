import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Baja de un click desde el email. El token identifica al usuario sin login
// (profiles.unsubscribe_token, ver 0027). Apaga notifications_enabled, que es el
// opt-in maestro compartido con el toggle de settings.
//
// GET  → click del link del mail (devuelve una página de confirmación).
// POST → List-Unsubscribe-Post One-Click (RFC 8058), lo pega el cliente de correo.
export const dynamic = "force-dynamic";

async function unsubscribe(token: string | null): Promise<boolean> {
  if (!token) return false;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ notifications_enabled: false })
    .eq("unsubscribe_token", token)
    .select("id");
  return !error && !!data && data.length > 0;
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const ok = await unsubscribe(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const ok = await unsubscribe(token);
  const msg = ok
    ? "Listo, no vas a recibir más estos avisos. Podés volver a activarlos desde Ajustes en la app."
    : "No pudimos procesar la baja. Es posible que el link haya expirado.";
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:420px;margin:64px auto;padding:24px;text-align:center;color:#1a1a1a">
  <h1 style="font-size:20px">${ok ? "Baja confirmada" : "Algo salió mal"}</h1>
  <p style="font-size:15px;line-height:1.5;color:#444">${msg}</p>
</div>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
