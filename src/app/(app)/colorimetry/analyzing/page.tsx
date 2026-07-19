"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Espera simulada: todavía no hay llamada a la IA, así que la pantalla avanza
// sola. Cuando exista el endpoint, este timeout se reemplaza por el fetch y el
// router.replace pasa a depender del verdict, como en /analysis/[id]/validating.
const FAKE_ANALYSIS_MS = 2600;

export default function AnalyzingColorimetryPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.replace("/colorimetry/result"), FAKE_ANALYSIS_MS);
    return () => clearTimeout(timer);
  }, [router]);

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
