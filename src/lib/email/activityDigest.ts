import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { buildDigestEmail, type DigestRow } from "./activityDigestContent";

export interface DigestResult {
  candidates: number;
  sent: number;
  failed: number;
  /** Cuántos candidatos entraron en esta franja (los otros esperan su franja). */
  inSlot?: number;
  /** Razón del primer fallo, para diagnóstico rápido desde la respuesta del cron. */
  firstError?: string;
}

// Franjas horarias del cron (UTC), en el mismo orden que vercel.json. Repartir a
// los usuarios entre ellas evita que TODOS los mails salgan a la misma hora: se
// ven menos robóticos y no generan un pico de envío. Si cambiás las horas del
// cron, cambialas acá también.
export const DIGEST_SLOT_HOURS_UTC = [13, 20];

/** Franja actual según la hora UTC, o null si no es una hora de cron (ej. curl manual). */
export function currentDigestSlot(): { index: number; count: number } | null {
  const idx = DIGEST_SLOT_HOURS_UTC.indexOf(new Date().getUTCHours());
  return idx === -1 ? null : { index: idx, count: DIGEST_SLOT_HOURS_UTC.length };
}

// Hash estable del id → franja. Estable = el mismo usuario cae siempre en la misma
// franja (recibe a "su" hora), no saltando al azar cada corrida.
function bucketOf(userId: string, count: number): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % count;
}

/**
 * Corre el digest: junta los usuarios con actividad nueva, les manda un mail, y
 * avanza su marca (last_activity_email_at) SOLO si el envío salió bien —así, si
 * un mail falla, esa actividad entra en el próximo digest en vez de perderse.
 */
export async function runActivityDigest(
  slot?: { index: number; count: number } | null,
): Promise<DigestResult> {
  const admin = createAdminClient();
  // La RPC no está en los tipos generados; cast puntual (mismo patrón que admin).
  const { data, error } = await admin.rpc("activity_digest_pending" as never);
  if (error) throw new Error(`activity_digest_pending falló: ${error.message}`);

  const allRows = (data ?? []) as unknown as DigestRow[];
  // Si viene una franja (corrida del cron), solo procesamos los usuarios de esa
  // franja; el resto sale en la suya. Sin franja (curl manual) van todos.
  const rows = slot
    ? allRows.filter((r) => bucketOf(r.user_id, slot.count) === slot.index)
    : allRows;
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

  return { candidates: allRows.length, inSlot: rows.length, sent, failed, firstError };
}
