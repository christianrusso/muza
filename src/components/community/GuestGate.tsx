"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { markGuestWall, track } from "@/lib/analytics";

/**
 * Modo invitado: el que no tiene sesión puede VER todo lo público, pero al tocar
 * cualquier acción le sale este muro. El registro se pide cuando la persona ya
 * vio el valor y quiere hacer algo, no en la puerta.
 *
 * Uso desde cualquier componente cliente:
 *
 *   const { requireAuth } = useGuestGate();
 *   function alVotar() {
 *     if (!requireAuth("vote")) return;   // invitado → abre el muro, corta acá
 *     ...                                 // logueado → sigue de largo
 *   }
 *
 * Fuera de un provider el default es "hay sesión", así que un componente que se
 * renderice suelto se comporta igual que antes de existir el modo invitado.
 */

// Las acciones que exigen cuenta. El valor viaja como propiedad de
// guest_wall_hit: es lo que después dice qué muro convierte y cuál no.
export type GuestAction =
  | "vote"
  | "like"
  | "comment"
  | "follow"
  | "author"
  | "publish"
  | "score"
  | "history"
  | "profile";

const COPY: Record<GuestAction, { title: string; body: string }> = {
  vote: {
    title: "Registrate para votar",
    body: "Adiviná qué score le puso la IA a este look y comparate con el resto de la comunidad.",
  },
  like: {
    title: "Registrate para dar me gusta",
    body: "Guardá los looks que te gustan y seguí a la gente que los publica.",
  },
  comment: {
    title: "Registrate para comentar",
    body: "Sumá tu opinión sobre el look y enterate qué responde el resto.",
  },
  follow: {
    title: "Registrate para seguir",
    body: "Armá tu feed con los looks de la gente que te interesa.",
  },
  author: {
    title: "Registrate para ver su perfil",
    body: "Mirá todos sus looks, sus scores y seguilo para no perderte lo que publica.",
  },
  publish: {
    title: "Registrate para publicar",
    body: "Subí tu look, recibí el score de la IA y los votos de la comunidad.",
  },
  score: {
    title: "Registrate para analizar tu look",
    body: "La IA lo puntúa en 10 categorías y te dice qué mejorar. Toma menos de un minuto.",
  },
  history: {
    title: "Registrate para tener tu historial",
    body: "Acá van a estar todos los looks que analices, con su score y su evolución.",
  },
  profile: {
    title: "Creá tu perfil",
    body: "Tus looks publicados, tus seguidores y tu progreso, todo en un lugar.",
  },
};

interface GuestGateValue {
  isAuthed: boolean;
  /** true si puede seguir; false si es invitado (y ya se le abrió el muro). */
  requireAuth: (action: GuestAction) => boolean;
}

const GuestGateContext = createContext<GuestGateValue>({
  isAuthed: true,
  requireAuth: () => true,
});

export function useGuestGate(): GuestGateValue {
  return useContext(GuestGateContext);
}

export function GuestGateProvider({
  isAuthed,
  children,
}: {
  isAuthed: boolean;
  children: React.ReactNode;
}) {
  const [action, setAction] = useState<GuestAction | null>(null);
  const pathname = usePathname();

  const requireAuth = useCallback(
    (a: GuestAction) => {
      if (isAuthed) return true;
      setAction(a);
      track("guest_wall_hit", { action: a, path: pathname });
      // Para atribuir la conversión si termina registrándose (ver analytics.ts).
      markGuestWall(a);
      return false;
    },
    [isAuthed, pathname],
  );

  const value = useMemo(() => ({ isAuthed, requireAuth }), [isAuthed, requireAuth]);

  return (
    <GuestGateContext.Provider value={value}>
      {children}
      {action && <RegisterSheet action={action} onClose={() => setAction(null)} />}
    </GuestGateContext.Provider>
  );
}

function RegisterSheet({ action, onClose }: { action: GuestAction; onClose: () => void }) {
  const pathname = usePathname();
  const copy = COPY[action];
  // Volver exactamente a donde estaba: el middleware ya sabe reenviar `next`
  // después de auth, y el onboarding lo pasa de largo (ver onboarding/page.tsx).
  const nextSuffix = `?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Tapa toda la ventana, no solo la columna: es un modal. z por encima de
          la tabbar (55) y por debajo del sheet. */}
      <div
        className="fixed inset-0 z-[59] bg-black/45"
        onClick={onClose}
        aria-hidden
        style={{ backdropFilter: "blur(2px)" }}
      />
      <BottomSheet
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-line" />
        <span className="block text-center font-serif italic" style={{ fontSize: 26 }}>
          {copy.title}
        </span>
        <p className="mt-2 text-center text-sm font-semibold text-muted">{copy.body}</p>

        <Link
          href={`/welcome${nextSuffix}`}
          className="mt-6 flex h-12 items-center justify-center rounded-full bg-coral text-sm font-extrabold text-white"
        >
          Crear cuenta gratis
        </Link>
        <Link
          href={`/login${nextSuffix}`}
          className="mt-2.5 flex h-12 items-center justify-center rounded-full text-sm font-extrabold text-ink"
        >
          Ya tengo cuenta
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-10 w-full text-[13px] font-bold text-faint"
        >
          Seguir mirando
        </button>
      </BottomSheet>
    </>
  );
}
