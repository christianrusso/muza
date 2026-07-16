import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

/**
 * ¿El que mira tiene sesión? Es la única pregunta que necesita el modo invitado:
 * un invitado puede VER todo lo público, pero cualquier acción (votar, seguir,
 * comentar, puntuar) le pide registrarse.
 *
 * Envuelto en cache() de React: el layout de tabs y la página piden lo mismo en
 * el mismo render y así se resuelve con un solo getUser.
 */
export const isViewerAuthed = cache(async (): Promise<boolean> => {
  // El modo demo simula una sesión (DEMO_USER) y no tiene Supabase configurado:
  // llamar a getUser() ahí reventaría. Ver lib/demo.ts.
  if (isDemoMode()) return true;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
});
