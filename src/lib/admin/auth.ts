// Autenticación del panel /admin, SEPARADA del login de usuarios de la app.
// Un email+password (env) genera una cookie firmada con HMAC-SHA256. Se usa
// tanto en el proxy (edge) como en route handlers (node), así que todo acá se
// apoya en Web Crypto / btoa / atob, disponibles en ambos runtimes. No importar
// "server-only" ni módulos de node: rompería el bundle del edge.

const COOKIE_NAME = "ll_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 horas

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET no está configurado");
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? 4 - (normalized.length % 4) : 0;
  const binary = atob(normalized + "=".repeat(pad));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

// Comparación en tiempo ~constante para no filtrar info por timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createAdminToken(): Promise<string> {
  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 })),
  );
  return `${payload}.${await sign(payload)}`;
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  if (!safeEqual(signature, expected)) return false;
  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { exp?: number };
    return typeof decoded.exp === "number" && Date.now() < decoded.exp;
  } catch {
    return false;
  }
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  const emailOk = email.trim().toLowerCase() === expectedEmail.trim().toLowerCase();
  const passwordOk = safeEqual(password, expectedPassword);
  return emailOk && passwordOk;
}

export const ADMIN_COOKIE = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
