"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Spinner } from "@/components/ui/Spinner";
import { track } from "@/lib/analytics";

// Marca el gate blando de colorimetría: el usuario compartió al menos una vez.
// Fire-and-forget: si falla, el share ya sucedió y no queremos molestar. Idempotente
// del lado del server (solo escribe la primera vez).
function markShared() {
  try {
    void fetch("/api/me/shared", { method: "POST" });
  } catch {
    // no-op
  }
}

// Botón de compartir del resultado. Comparte la TARJETA del score como imagen
// (PNG generado en /api/analyses/<id>/share-card): en mobile abre el share sheet
// nativo con la imagen adjunta, así se puede mandar directo a WhatsApp o a una
// historia de Instagram. En desktop (sin Web Share de archivos) descarga la imagen
// para guardarla y postearla a mano.
//
// variant:
//   "icon" — el iconito del header (compacto).
//   "full" — botón grande con label, para hacerlo visible en la tarjeta del score
//            (compartir movía apenas 1 de 77; el iconito pasaba desapercibido).
export function ShareButton({
  analysisId,
  variant = "icon",
}: {
  analysisId: string;
  variant?: "icon" | "full";
}) {
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
          markShared();
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
      markShared();
      flash("Imagen descargada");
    } catch {
      flash("No se pudo generar la imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {variant === "full" ? (
        <button
          type="button"
          onClick={handleShare}
          disabled={busy}
          className="btn btn-outline w-full disabled:opacity-90"
        >
          {busy ? <Spinner size={18} /> : <MaterialIcon name="ios_share" size={20} />}
          Compartí tu Outfit Score
        </button>
      ) : (
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
      )}
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
