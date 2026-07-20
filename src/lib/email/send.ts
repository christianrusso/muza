import "server-only";

// Envío de email transaccional vía la API HTTP de SendGrid (sin SDK: un fetch).
// Config por entorno:
//   SENDGRID_API_KEY   — clave de la cuenta (obligatoria para enviar de verdad)
//   EMAIL_FROM         — remitente verificado en SendGrid (ej. "hola@looklab.io")
//   EMAIL_FROM_NAME    — nombre visible (default "LookLab")
//
// SIN SENDGRID_API_KEY es un no-op: loguea y devuelve false, sin romper. Así el
// dev/demo y los tests corren sin cuenta de email.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Header List-Unsubscribe: baja de un click desde el cliente de correo (Gmail,
  // Apple Mail). Mejora deliverability y es buena práctica legal.
  unsubscribeUrl?: string;
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(`[looklab] email no enviado (falta SENDGRID_API_KEY/EMAIL_FROM): "${msg.subject}" → ${msg.to}`);
    return false;
  }

  const headers: Record<string, string> = {};
  if (msg.unsubscribeUrl) {
    // One-Click: RFC 8058. El cliente de correo puede dar de baja sin abrir nada.
    headers["List-Unsubscribe"] = `<${msg.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }], ...(Object.keys(headers).length ? { headers } : {}) }],
      from: { email: from, name: process.env.EMAIL_FROM_NAME ?? "LookLab" },
      subject: msg.subject,
      content: [
        { type: "text/plain", value: msg.text },
        { type: "text/html", value: msg.html },
      ],
      // Rastreo de aperturas/clics lo maneja SendGrid según la config de la cuenta;
      // no lo forzamos acá.
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[looklab] SendGrid ${res.status} enviando a ${msg.to}: ${body.slice(0, 300)}`);
    return false;
  }
  return true;
}
