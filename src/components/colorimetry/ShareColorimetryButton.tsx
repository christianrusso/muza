"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Comparte la temporada como texto. El análisis de outfit comparte una imagen
// generada en el servidor; acá todavía no hay share-card, así que el texto es
// lo que se puede compartir sin inventar un endpoint.
export function ShareColorimetryButton({ season }: { season: string }) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleShare() {
    const text = `Mi temporada de color es ${season} — LookLab.io`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "LookLab.io — Mi colorimetría", text });
      } catch {
        // el usuario canceló el share sheet — nada que hacer
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copiado");
    } catch {
      setToast("No se pudo compartir");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Compartir"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
      >
        <MaterialIcon name="ios_share" size={20} className="text-white" />
      </button>
      {toast && (
        <div
          className="fixed inset-x-0 bottom-8 z-50 flex justify-center"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper">{toast}</span>
        </div>
      )}
    </>
  );
}
