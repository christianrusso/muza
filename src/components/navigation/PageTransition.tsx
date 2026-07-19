"use client";

import { usePathname } from "next/navigation";

/**
 * Reinicia la animación de entrada (`.fade-enter`, ya usada en el reto diario)
 * cada vez que cambia la ruta, para que moverse entre tabs o abrir un análisis
 * se sienta como una transición y no como un corte seco. `key={pathname}`
 * fuerza a React a remontar el div, lo que reinicia el CSS animation.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="fade-enter">
      {children}
    </div>
  );
}
