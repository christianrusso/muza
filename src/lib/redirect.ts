// Destino al que volver después de autenticarse. Cuando el middleware corta a un
// visitante sin sesión, guarda la ruta que pedía en el query param `next`; las
// pantallas de auth (welcome/login/register) y el callback OAuth lo reenvían y
// finalmente redirigen ahí en vez de a /home.

const DEFAULT_DESTINATION = "/home";

// Sanitiza `next`: solo aceptamos rutas internas relativas. Rechazamos cualquier
// cosa que no empiece con "/" (URLs absolutas a otro dominio) y las formas "//"
// o "/\" que los navegadores interpretan como protocol-relative → open redirect.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return DEFAULT_DESTINATION;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_DESTINATION;
  return next;
}

// Sufijo `?next=...` listo para pegar a un href/redirectTo, o "" si no hay next.
export function nextQuery(next: string | null | undefined): string {
  return next ? `?next=${encodeURIComponent(next)}` : "";
}
