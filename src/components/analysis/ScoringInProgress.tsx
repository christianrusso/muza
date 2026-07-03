"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Pantalla de resultado en estado "calculando": muestra la foto del usuario y un
// skeleton mientras la IA puntúa, y dispara el scoring. Al terminar refresca el
// server component (que ya trae el score) → aparece el resultado real. Reemplaza
// la espera en pantalla negra por algo que se siente inmediato.
export function ScoringInProgress({
  analysisId,
  occasionId,
  photoUrl,
}: {
  analysisId: string;
  occasionId: string;
  photoUrl?: string;
}) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // una sola vez (evita doble llamada en StrictMode)
    ran.current = true;

    (async () => {
      const res = await fetch(`/api/analyses/${analysisId}/score`, { method: "POST" });
      if (!res.ok) {
        router.replace(`/analysis/${analysisId}/invalid?occasion=${occasionId}`);
        return;
      }
      router.refresh(); // re-renderiza el resultado ya con el score
    })();
  }, [analysisId, occasionId, router]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="ph relative overflow-hidden" style={{ height: 266 }}>
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(20,18,16,.28), rgba(20,18,16,0) 30%, rgba(247,245,240,0) 70%, var(--paper))",
            }}
          />
          <div className="absolute left-5 right-5 top-[58px] flex items-center">
            <Link
              href="/home"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
              style={{ background: "rgba(247,245,240,.9)" }}
            >
              <MaterialIcon name="chevron_left" size={22} />
            </Link>
          </div>
        </div>

        <div className="relative px-[22px]" style={{ marginTop: -70 }}>
          <div
            className="card flex flex-col items-center gap-4 p-[22px]"
            style={{ boxShadow: "0 18px 40px -22px rgba(20,18,16,.3)" }}
          >
            <div className="spinner" style={{ width: 58, height: 58 }} />
            <div className="flex flex-col items-center gap-1">
              <span className="font-serif text-[20px]">Calculando tu score…</span>
              <span className="text-[13px] font-semibold text-muted">Analizando tu outfit con IA</span>
            </div>
          </div>

          <span className="section-label mb-3.5 mt-[26px] block px-1">Desglose por categoría</span>
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-3 w-1/3 animate-pulse rounded-full bg-black/[.07]" />
                <div className="h-2.5 w-full animate-pulse rounded-full bg-black/[.05]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
