"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

type Progress = {
  shares: { have: number; need: number };
  votes: { have: number; need: number };
};

// Dispara `colorimetry_blocked` una sola vez cuando se le muestra el muro de
// requisitos al usuario. No renderiza nada; va dentro del muro (server component).
// Las props dicen cuánto le faltaba de cada requisito (compartir / votar), para
// ver qué muro convierte y qué queda como cuello de botella.
export function ColorimetryBlockedTracker({ progress }: { progress: Progress }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("colorimetry_blocked", {
      shares_have: progress.shares.have,
      shares_need: progress.shares.need,
      votes_have: progress.votes.have,
      votes_need: progress.votes.need,
    });
  }, [progress]);
  return null;
}
