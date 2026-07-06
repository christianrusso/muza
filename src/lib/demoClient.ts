// Client-safe demo-mode flag (no "server-only" import, unlike lib/demo.ts).
// NEXT_PUBLIC_ vars are inlined at build time, so this works in the browser too.
const missingCreds = !process.env.NEXT_PUBLIC_SUPABASE_URL;

// Red de seguridad (espejo de lib/demo.ts): el modo demo nunca debe activarse en
// un build de producción. Si faltan las credenciales en prod, fallamos ruidoso.
if (missingCreds && process.env.NODE_ENV === "production") {
  throw new Error(
    "[Muza] Falta NEXT_PUBLIC_SUPABASE_URL en producción: la app no puede correr en modo demo en prod.",
  );
}

export const DEMO_MODE = missingCreds;
