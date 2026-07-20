"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renderiza los hijos directo en <body>, fuera del árbol de la página.
 *
 * Por qué hace falta: la transición de página (`PageTransition`, que anima
 * `opacity`/`transform`) crea sin querer un stacking context nuevo alrededor
 * de todo el contenido de la pantalla. Sin portal, un modal con z-index alto
 * pero anidado ahí adentro queda igual "atrapado" por debajo de elementos
 * externos con su propio z-index (como la tab bar) — el número de z-index dejó
 * de importar porque ya no compiten en el mismo contexto. Sacarlo con un
 * portal evita depender de nunca introducir un ancestro así (animación,
 * transform, filter, etc.) entre el modal y el root.
 */
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // Patrón estándar de portal SSR-safe: no renderizar hasta montar en cliente,
  // porque document.body no existe en el server.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
