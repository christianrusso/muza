"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { track } from "@/lib/analytics";

// Botón de compartir del header del resultado (arriba a la derecha, sobre la
// foto). Comparte el POST PÚBLICO de comunidad (/community/post/<id>), no la URL
// privada del resultado (/analysis/<id>/result, que exige login y dejaba el link
// compartido inservible). Si el look todavía no está publicado, lo publica al
// vuelo para generar el enlace público y refresca la pantalla para que la tarjeta
// "Compartilo con la comunidad" pase a "Publicado".
export function ShareButton({ analysisId, postId }: { analysisId: string; postId: string | null }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  // Guardamos el id publicado para no re-publicar (ni duplicar) si toca compartir
  // de nuevo en la misma pantalla.
  const [publishedId, setPublishedId] = useState<string | null>(postId);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      let id = publishedId;
      let justPublished = false;

      // Sin post público todavía: publicamos para tener un enlace compartible.
      if (!id) {
        const res = await fetch("/api/community/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId }),
        });
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (!res.ok || !data?.id) {
          flash("No se pudo generar el enlace");
          return;
        }
        id = data.id;
        setPublishedId(id);
        justPublished = true;
        track("published", { analysis_id: analysisId });
      }

      const url = `${window.location.origin}/community/post/${id}`;
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
        flash("Enlace copiado");
      }

      // Recién publicado: refrescamos para que la pantalla refleje el estado
      // "Publicado" y no se pueda publicar de nuevo desde la tarjeta de abajo.
      if (justPublished) router.refresh();
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        aria-label="Compartir"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full disabled:opacity-60"
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
