import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { buildDigestEmail, type DigestRow } from "./activityDigestContent";

export interface DigestResult {
  candidates: number;
  sent: number;
  failed: number;
  /** Razón del primer fallo, para diagnóstico rápido desde la respuesta del cron. */
  firstError?: string;
}

/**
 * Corre el digest: junta los usuarios con actividad nueva, les manda un mail, y
 * avanza su marca (last_activity_email_at) SOLO si el envío salió bien —así, si
 * un mail falla, esa actividad entra en el próximo digest en vez de perderse.
 */
export async function runActivityDigest(): Promise<DigestResult> {
  const admin = createAdminClient();
  // La RPC no está en los tipos generados; cast puntual (mismo patrón que admin).
  const { data, error } = await admin.rpc("activity_digest_pending" as never);
  if (error) throw new Error(`activity_digest_pending falló: ${error.message}`);

  const rows = (data ?? []) as unknown as DigestRow[];
  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const row of rows) {
    const mail = buildDigestEmail(row);
    const res = await sendEmail({
      to: row.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      unsubscribeUrl: mail.unsubscribeUrl,
    });
    if (!res.ok) {
      failed++;
      if (!firstError) firstError = res.error;
      continue;
    }
    // Avanzar la marca de este usuario. now() del servidor: la actividad que
    // llegue entre el query y este update entra en el próximo digest.
    const { error: updErr } = await admin
      .from("profiles")
      .update({ last_activity_email_at: new Date().toISOString() })
      .eq("id", row.user_id);
    if (updErr) {
      // El mail ya se mandó; si no pudimos avanzar la marca, lo peor es un
      // duplicado mañana. Lo dejamos registrado pero no lo contamos como fallo.
      console.error(`[looklab] digest: no se pudo avanzar la marca de ${row.user_id}: ${updErr.message}`);
    }
    sent++;
  }

  return { candidates: rows.length, sent, failed, firstError };
}
