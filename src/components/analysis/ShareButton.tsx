"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { track } from "@/lib/analytics";

// Botón de compartir del header del resultado (arriba a la derecha, sobre la
// foto). Reemplaza la barra flotante `.bottom-cta` que quedaba encima del
// desglose. En mobile abre el share sheet nativo; en desktop copia el enlace y
// avisa con un toast breve.
export function ShareButton() {
  const [toast, setToast] = useState<string | null>(null);

  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "LookLab — Mi Outfit Score", url });
        track("shared", { method: "native_share" });
      } catch {
        // el usuario canceló el share sheet — nada que hacer
      }
    } else {
      await navigator.clipboard.writeText(url);
      track("shared", { method: "copy_link" });
      setToast("Enlace copiado");
      setTimeout(() => setToast(null), 2000);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Compartir"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
        style={{ background: "rgba(247,245,240,.9)" }}
      >
        <MaterialIcon name="ios_share" size={20} />
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
