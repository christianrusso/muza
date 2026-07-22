"use client";

import { useEffect, useState } from "react";

// Badge "Sin jugar hoy" de la tarjeta de Home. El server sabe si el usuario
// LOGUEADO ya jugó (serverPlayed); para el INVITADO el server no sabe, así que
// acá completamos con el localStorage que guarda el intento del día.
export function ChallengeCardBadge({ serverPlayed }: { serverPlayed: boolean }) {
  const [played, setPlayed] = useState(serverPlayed);

  useEffect(() => {
    if (serverPlayed) return;
    try {
      const raw = localStorage.getItem("looklab:challenge_attempt");
      if (!raw) return;
      const saved = JSON.parse(raw) as { date: string };
      const today = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
      // Post-montaje a propósito: leer localStorage en el render rompería la
      // hidratación (server sin dato del invitado, cliente con él).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved.date === today) setPlayed(true);
    } catch {
      // no-op
    }
  }, [serverPlayed]);

  if (played) return null;

  return (
    <span className="flex-none rounded-full bg-coral px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
      Sin jugar hoy
    </span>
  );
}
