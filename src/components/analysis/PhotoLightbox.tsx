"use client";

import { useState } from "react";

/**
 * Miniatura nítida de la foto analizada sobre el header borroso del score.
 * El fondo sigue siendo la foto con blur (textura de color), pero acá el usuario
 * ve la prenda de verdad y puede tocarla para ampliarla a pantalla completa.
 */
export function PhotoLightbox({ url }: { url: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver foto analizada"
        className="block overflow-hidden rounded-2xl ring-2 ring-white/80 shadow-[0_12px_30px_-12px_rgba(20,18,16,.6)]"
        style={{ width: 70, aspectRatio: "4 / 5" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Foto analizada" className="h-full w-full object-cover" decoding="async" />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Foto analizada"
            className="max-h-full max-w-full rounded-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}
