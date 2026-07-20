import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

// Mientras el Placard esté mockeado (sin backend ni IA reales), en producción se
// muestra "Próximamente" a todo el mundo salvo a una allowlist de cuentas de
// prueba que sí pueden recorrer el flujo completo. La lista se configura por env,
// coma-separada:  PLACARD_TESTERS="tester@looklab.app, otra@ejemplo.com".
// Cuando el feature esté listo para todos, se borra este gate (y la env).
function testerEmails(): Set<string> {
  return new Set(
    (process.env.PLACARD_TESTERS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * ¿El que mira puede ver el flujo completo del Placard (vs. la pantalla de
 * "Próximamente")? Cacheado por render: el page de la tab y el layout de las
 * subrutas preguntan lo mismo y se resuelve con un solo getUser.
 */
export const canAccessPlacard = cache(async (): Promise<boolean> => {
  // Demo (dev/preview) ve el flujo entero: es como lo venimos mirando y el modo
  // demo nunca corre en prod (ver lib/demo.ts).
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
