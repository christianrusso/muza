"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics";

function ValidatingContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const occasion = searchParams.get("occasion") ?? "other";
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const validateRes = await fetch(`/api/analyses/${params.id}/validate`, { method: "POST" });
      const validation = await validateRes.json();

      track("validation", {
        occasion_id: occasion,
        verdict: !validateRes.ok ? "error" : validation.verdict,
        analysis_type: validation.analysisType ?? null,
        // Con esto se puede ver en PostHog QUÉ se rechaza, no solo cuánto.
        invalid_reason: validateRes.ok ? (validation.invalidReason ?? null) : null,
        error_code: !validateRes.ok ? (validation.error?.code ?? "UNKNOWN") : null,
      });

      // Un fallo del servicio NO es una foto inválida. Mandarlo a la misma
      // pantalla le dice a alguien con una foto impecable que mejore la luz.
      if (!validateRes.ok) {
        router.replace(
          `/analysis/${params.id}/invalid?occasion=${occasion}&reason=service_error`,
        );
        return;
      }

      if (validation.verdict === "invalid") {
        router.replace(
          `/analysis/${params.id}/invalid?occasion=${occasion}` +
            `&reason=${validation.invalidReason ?? "unknown"}`,
        );
        return;
      }

      if (validation.verdict === "partial") {
        router.replace(
          `/analysis/${params.id}/partial?occasion=${occasion}&type=${validation.analysisType ?? "individual"}`,
        );
        return;
      }

      // Validación OK: avanzamos ya al resultado, que muestra la foto + skeleton
      // y dispara el scoring. Así no bloqueamos con la pantalla negra durante la IA.
      router.replace(`/analysis/${params.id}/result`);
    }

    run();
  }, [params.id, occasion, router]);

  return (
    <div
      className="screen-body relative flex min-h-dvh flex-col items-center justify-center gap-[22px]"
      style={{ background: "linear-gradient(#1F1B17,#141210)" }}
    >
      <div className="spinner" style={{ width: 66, height: 66 }} />
      <div className="flex flex-col items-center gap-1.5">
        <span className="font-serif text-2xl text-paper">Validando tu outfit…</span>
        <span className="text-[13px] font-semibold text-white/70">Esto toma solo un segundo</span>
      </div>
    </div>
  );
}

export default function ValidatingPage() {
  return (
    <Suspense>
      <ValidatingContent />
    </Suspense>
  );
}
