"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Spinner } from "@/components/ui/Spinner";
import { track } from "@/lib/analytics";

// Botón de compartir del header del resultado. Comparte la TARJETA del score como
// imagen (PNG generado en /api/analyses/<id>/share-card): en mobile abre el share
// sheet nativo con la imagen adjunta, así se puede mandar directo a WhatsApp o a
// una historia de Instagram. En desktop (sin Web Share de archivos) descarga la
// imagen para guardarla y postearla a mano.
export function ShareButton({ analysisId }: { analysisId: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/share-card`);
      if (!res.ok) {
        flash("No se pudo generar la imagen");
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], "looklab-score.png", { type: "image/png" });

      // Web Share API nivel 2 (mobile): compartir la imagen como archivo adjunto.
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "LookLab.io — Mi Outfit Score" });
          track("shared", { method: "native_share" });
        } catch {
          // el usuario canceló el share sheet — nada que hacer
        }
        return;
      }

      // Fallback (desktop / sin Web Share de archivos): descargar la imagen.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "looklab-score.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      track("shared", { method: "download" });
      flash("Imagen descargada");
    } catch {
      flash("No se pudo generar la imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        aria-label="Compartir"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full disabled:opacity-90"
        style={{ background: "rgba(247,245,240,.9)" }}
      >
        {busy ? <Spinner size={18} /> : <MaterialIcon name="ios_share" size={20} />}
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
