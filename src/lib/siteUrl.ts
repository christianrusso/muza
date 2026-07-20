// URL base del sitio, para links absolutos fuera del request (ej. emails). Misma
// prioridad que layout.tsx: override explícito → prod (looklab.io) → preview de
// Vercel → localhost.
const PRODUCTION_DOMAIN = "https://looklab.io";

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_ENV === "production"
      ? PRODUCTION_DOMAIN
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  );
}
