"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { identify, resetAnalytics } from "@/lib/analytics";

// Asocia la persona de PostHog con el usuario real de Supabase en un solo lugar,
// cubriendo todos los caminos (login por email, OAuth que vuelve por el callback
// del server, y recargas de página). Sin esto, cada dispositivo/cookie es una
// persona anónima distinta y no se puede medir retención D1/D7. No renderiza nada.
export function AnalyticsIdentify() {
  useEffect(() => {
    if (DEMO_MODE) return;
    const supabase = createClient();

    // Identifica la sesión ya presente al cargar (incluye el retorno de OAuth).
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) identify(user.id);
    });

    // Login/logout posteriores dentro de la misma pestaña.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        identify(session.user.id);
      } else if (event === "SIGNED_OUT") {
        resetAnalytics();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
