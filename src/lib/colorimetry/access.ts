import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

// La colorimetría todavía está en desarrollo: en producción se muestra
// "Próximamente" a todo el mundo salvo a una allowlist de cuentas de prueba. Se
// configura por env, coma-separada:
//   COLORIMETRY_TESTERS="crusso@clamaco.com.ar, otra@ejemplo.com"
// Cuando el feature esté listo para todos, se borra este gate (y la env).
function testerEmails(): Set<string> {
  return new Set(
    (process.env.COLORIMETRY_TESTERS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * ¿El que mira puede usar la colorimetría (vs. "Próximamente")? Cacheado por
 * render: el home y el layout de las rutas preguntan lo mismo con un solo getUser.
 */
export const canAccessColorimetry = cache(async (): Promise<boolean> => {
  // Demo (dev/preview) ve el flujo entero; el modo demo nunca corre en prod.
  if (isDemoMode()) return true;

  const allow = testerEmails();
  if (allow.size === 0) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  return Boolean(email && allow.has(email));
});
