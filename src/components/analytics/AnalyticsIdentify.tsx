"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { claimSignupOnce, identify, resetAnalytics, track, trackGuestConversion } from "@/lib/analytics";
import { trackCompleteRegistration } from "@/lib/completeRegistration";
import { isOAuthSignup } from "@/lib/signup";

function handleAuthenticatedUser(user: User) {
  // El email y el nombre van como propiedades de persona para que la lista de
  // People de PostHog sea legible: sin esto cada persona aparece solo con su
  // UUID de Supabase y hay que cruzarla a mano contra la base. Se usan las
  // claves $email/$name que PostHog reconoce como estándar.
  identify(user.id, {
    $email: user.email,
    $name: user.user_metadata?.full_name ?? user.email?.split("@")[0],
  });
  // Después de identify, para que los eventos queden en la persona real.
  if (isOAuthSignup(user) && claimSignupOnce(user.id)) {
    track("signed_up", { method: "oauth" });
    // Mismo evento de campaña que emite el formulario de password. El alta por
    // Google se consuma en el callback, así que ese es el origen que reportamos.
    trackCompleteRegistration({ email: user.email, sourcePath: "/auth/callback" });
  }
  trackGuestConversion();
}

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
      if (!user) return;
      handleAuthenticatedUser(user);
    });

    // Login/logout posteriores dentro de la misma pestaña.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        // Tanto signed_up como guest_converted se consumen con una marca, así
        // que solo se emiten una vez por más que este callback y el getUser de
        // arriba se pisen.
        handleAuthenticatedUser(session.user);
      } else if (event === "SIGNED_OUT") {
        resetAnalytics();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
