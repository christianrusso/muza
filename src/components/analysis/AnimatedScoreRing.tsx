"use client";

import { useEffect, useState } from "react";
import { scoreBandColorVar } from "@/lib/scoring/categories";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Igual que ScoreRing, pero el número "carga" de 0 hasta el score y el anillo
 * se va llenando en sincronía — el momento en que el usuario ve su puntaje.
 * El color se fija al de la banda final (no parpadea rojo→ámbar→verde mientras
 * sube). Respeta "reducir movimiento": muestra el valor final de una.
 */
export function AnimatedScoreRing({
  score,
  size = 132,
  innerInset = 11,
  valueFontSize = 46,
  maxFontSize = 10,
  durationMs = 750,
}: {
  score: number;
  size?: number;
  innerInset?: number;
  valueFontSize?: number;
  maxFontSize?: number;
  durationMs?: number;
}) {
  const target = Math.max(0, Math.min(100, score));
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      // Sin animación: mostrar el valor final de una. Es el comportamiento
      // correcto para "reducir movimiento", no un setState problemático.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(easeOutCubic(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return (
    <div
      className="ring"
      style={
        {
          width: size,
          height: size,
          "--p": value / 100,
          "--c": scoreBandColorVar(target),
        } as React.CSSProperties
      }
    >
      <div className="inner" style={{ inset: innerInset }}>
        <span className="val" style={{ fontSize: valueFontSize }}>
          {value}
        </span>
        <span className="max" style={{ fontSize: maxFontSize }}>
          / 100
        </span>
      </div>
    </div>
  );
}
