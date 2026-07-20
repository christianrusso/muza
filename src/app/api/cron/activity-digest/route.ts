import { NextResponse } from "next/server";
import { runActivityDigest } from "@/lib/email/activityDigest";

// Digest diario de actividad. Lo dispara el cron de Vercel (ver vercel.json).
//
// Protección: Vercel manda el header `Authorization: Bearer <CRON_SECRET>` si la
// env CRON_SECRET está seteada. Exigimos ese secreto para que nadie más pueda
// disparar envíos masivos golpeando la URL.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: "CRON_NOT_CONFIGURED", message: "Falta CRON_SECRET." } },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  try {
    const result = await runActivityDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[looklab] digest cron falló: ${message}`);
    return NextResponse.json({ error: { code: "DIGEST_FAILED", message } }, { status: 500 });
  }
}
