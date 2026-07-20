import { siteUrl } from "@/lib/siteUrl";

// Contenido del digest de actividad — PURO (sin server-only ni I/O), para poder
// testearlo y previsualizarlo sin base ni SendGrid. El envío vive en
// activityDigest.ts; esto solo arma subject/html/text a partir de los conteos.

// Fila que devuelve la RPC activity_digest_pending() (ver 0027).
export interface DigestRow {
  user_id: string;
  email: string;
  full_name: string;
  unsubscribe_token: string;
  new_likes: number;
  new_comments: number;
  new_follows: number;
  new_vote_posts: number;
  new_votes: number;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

// Frase natural con lo que tiene señal (>0): "12 personas votaron tu look, 3
// le dieron like y 1 comentó".
function summarize(row: DigestRow): { headline: string; parts: string[] } {
  const parts: string[] = [];
  if (row.new_votes > 0)
    parts.push(`${row.new_votes} ${row.new_votes === 1 ? "persona votó" : "personas votaron"} tu look`);
  if (row.new_likes > 0) parts.push(`${row.new_likes} le ${row.new_likes === 1 ? "dio" : "dieron"} like`);
  if (row.new_comments > 0) parts.push(`${row.new_comments} ${row.new_comments === 1 ? "comentó" : "comentaron"}`);
  if (row.new_follows > 0)
    parts.push(`${row.new_follows} ${row.new_follows === 1 ? "empezó" : "empezaron"} a seguirte`);

  const headline =
    row.new_votes > 0
      ? `${row.new_votes} ${row.new_votes === 1 ? "persona votó" : "personas votaron"} tu look 👀`
      : row.new_likes > 0
        ? `Tu look gustó: ${row.new_likes} ${row.new_likes === 1 ? "like nuevo" : "likes nuevos"}`
        : row.new_comments > 0
          ? "Tenés comentarios nuevos en tu look"
          : "Tenés seguidores nuevos";

  return { headline, parts };
}

function joinNatural(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return parts.slice(0, -1).join(", ") + " y " + parts[parts.length - 1];
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function buildDigestEmail(row: DigestRow): BuiltEmail {
  const base = siteUrl();
  const activityUrl = `${base}/community/activity`;
  const unsubscribeUrl = `${base}/api/email/unsubscribe?token=${row.unsubscribe_token}`;
  const firstName = row.full_name?.split(" ")[0] || "Hola";
  const { headline, parts } = summarize(row);
  const body = joinNatural(parts);

  const text =
    `${firstName}, ${body}.\n\n` +
    `Mirá quién y qué en la app: ${activityUrl}\n\n` +
    `Para dejar de recibir estos avisos: ${unsubscribeUrl}`;

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h1 style="font-size:20px;margin:0 0 8px">${escapeHtml(headline)}</h1>
  <p style="font-size:15px;line-height:1.5;color:#444;margin:0 0 20px">${escapeHtml(firstName)}, ${escapeHtml(body)}.</p>
  <a href="${activityUrl}" style="display:inline-block;background:#e5623a;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Ver la actividad</a>
  <p style="font-size:12px;color:#999;margin:28px 0 0">
    Recibís esto porque tenés las notificaciones activadas en LookLab.
    <a href="${unsubscribeUrl}" style="color:#999">Dejar de recibirlos</a>.
  </p>
</div>`;

  return { subject: headline, html, text, unsubscribeUrl };
}
