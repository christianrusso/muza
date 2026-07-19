import type { User } from "@supabase/supabase-js";

// Margen entre created_at y last_sign_in_at para considerar que la sesión es un
// alta y no un login. En un alta los dos los escribe Supabase en el mismo
// request; en un login posterior last_sign_in_at queda lejos del created_at.
const SIGNUP_WINDOW_MS = 10_000;

/**
 * ¿Esta sesión es un alta nueva por OAuth? El registro por contraseña ya emite
 * sus propios eventos desde el formulario, así que acá miramos solo los
 * proveedores externos para no contar dos veces.
 */
export function isOAuthSignup(user: Pick<User, "app_metadata" | "created_at" | "last_sign_in_at">): boolean {
  const provider = user.app_metadata?.provider;
  if (!provider || provider === "email") return false;
  const created = new Date(user.created_at).getTime();
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : created;
  if (Number.isNaN(created) || Number.isNaN(lastSignIn)) return false;
  return Math.abs(lastSignIn - created) < SIGNUP_WINDOW_MS;
}

/**
 * El sourcePath del evento CompleteRegistration llega del cliente, así que solo
 * aceptamos una ruta relativa simple: nada de "//host" ni de esquemas que saquen
 * el eventSourceUrl fuera de nuestro origen.
 */
export function safeSourcePath(value: unknown): string {
  if (typeof value !== "string") return "/register";
  if (!value.startsWith("/") || value.startsWith("//")) return "/register";
  return value;
}
