"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

/**
 * Miniatura nítida de la foto analizada sobre el header borroso del score.
 * Al tocarla se amplía a pantalla completa. El modal se monta con un portal en
 * document.body: el wrapper de la miniatura tiene transform (-translate-x-1/2) y
 * un position:fixed dentro de un ancestro con transform se posiciona relativo a
 * ESE ancestro (no al viewport), así que sin el portal el modal quedaba atrapado
 * en la cajita de 70px. Se cierra con la X, tocando el fondo o con Escape.
 */
export function PhotoLightbox({ url }: { url: string }) {
  // El portal solo se monta cuando open es true, y eso solo ocurre tras un click
  // del usuario (ya en el cliente): document.body siempre existe ahí, así que no
  // hace falta un guard de "mounted".
  const [open, setOpen] = useState(false);

  // Escape para cerrar + bloqueo de scroll del fondo mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ampliar foto analizada"
        className="block overflow-hidden rounded-2xl ring-2 ring-white/80 shadow-[0_12px_30px_-12px_rgba(20,18,16,.6)]"
        style={{ width: 70, aspectRatio: "4 / 5" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Foto analizada" className="h-full w-full object-cover" decoding="async" />
      </button>

      {open &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Foto analizada"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
              style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
            >
              <MaterialIcon name="close" size={24} />
            </button>
            {/* stopPropagation: tocar la foto no cierra; solo el fondo o la X. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Foto analizada"
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
