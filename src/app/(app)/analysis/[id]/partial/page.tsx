"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import type { AnalysisType } from "@/types/domain";

function PartialContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const occasion = searchParams.get("occasion") ?? "other";
  const analysisType = (searchParams.get("type") ?? "individual") as AnalysisType;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${params.id}/score`, { method: "POST" });
      if (res.ok) {
        router.push(`/analysis/${params.id}/result`);
        return;
      }
      // Un parcial puede terminar sin ninguna prenda detectada (422): la parte
      // visible no alcanzaba. Es un veredicto sobre la foto, no una falla.
      if (res.status === 409 || res.status === 422) {
        const body = await res.json().catch(() => null);
        const reason = body?.error?.reason;
        router.replace(
          `/analysis/${params.id}/invalid?occasion=${occasion}` + (reason ? `&reason=${reason}` : ""),
        );
        return;
      }
      // Antes cualquier fallo dejaba el botón sin hacer nada y sin explicación.
      setError("No pudimos calcular tu puntaje. Fue un problema momentáneo, probá de nuevo.");
    } catch {
      setError("No pudimos calcular tu puntaje. Revisá tu conexión y probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative flex min-h-dvh flex-col justify-end"
      style={{ background: "linear-gradient(#1F1B17,#141210)" }}
    >
      <div className="absolute left-5 top-[58px]">
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/[.14]"
        >
          <MaterialIcon name="close" size={22} className="text-white" />
        </button>
      </div>

      <div
        className="rounded-t-[28px] bg-card p-6 pt-8"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <AnalysisTypePill type={analysisType} />
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-soft">
            <MaterialIcon name="crop" size={26} className="text-[var(--amber-ink)]" />
          </span>
          <div>
            <p className="font-serif text-xl">Analizamos solo la parte visible</p>
            <p className="mt-1 text-sm font-semibold text-muted">
              Detectamos la parte visible de tu outfit. Podés continuar o volver a intentar.
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-3 text-center text-[13px] font-semibold text-coral">{error}</p>
        )}

        <Button onClick={handleContinue} disabled={submitting} className="mb-2.5">
          {submitting ? "Analizando..." : "Continuar de todos modos"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/analysis/new/capture?occasion=${occasion}`)}
        >
          Reintentar
        </Button>
      </div>
    </div>
  );
}

export default function PartialPage() {
  return (
    <Suspense>
      <PartialContent />
    </Suspense>
  );
}
