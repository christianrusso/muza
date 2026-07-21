"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export default function AnalyzingColorimetryPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // Evita doble disparo (StrictMode monta dos veces en dev).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const photoPath = params.get("photo");

    (async () => {
      try {
        const res = await fetch("/api/colorimetry/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoPath: photoPath ?? "demo" }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? "No se pudo generar la colorimetría.");
        router.replace("/colorimetry/result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Algo salió mal. Probá de nuevo.");
      }
    })();
  }, [params, router]);

  if (error) {
    return (
      <div className="screen-body pad flex flex-col items-center justify-center gap-4 text-center">
        <MaterialIcon name="error_outline" size={48} className="text-[var(--red)]" />
        <p className="text-[15px] font-semibold text-muted">{error}</p>
        <button type="button" className="btn btn-violet" onClick={() => router.replace("/colorimetry/new")}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="ph-dark relative flex min-h-dvh flex-col items-center justify-center gap-[22px]">
      {/* ph-dark solo aporta la textura diagonal; el velo la lleva al negro de
          la pantalla de validación del análisis, si no queda gris lavado. */}
      <div className="absolute inset-0" style={{ background: "rgba(18,16,14,.62)" }} />
      <div className="relative flex items-center justify-center">
        <div
          className="spinner"
          style={{ width: 108, height: 108, borderTopColor: "var(--violet)" }}
        />
        <MaterialIcon
          name="palette"
          size={38}
          className="absolute text-[var(--violet)]"
        />
      </div>
      <div className="relative flex flex-col items-center gap-1.5 px-8 text-center">
        <span className="font-serif text-2xl text-paper">Analizando tu colorimetría…</span>
        <span className="text-[13px] font-semibold text-white/70">
          Detectando temporada, subtono y paleta ideal
        </span>
      </div>
    </div>
  );
}
