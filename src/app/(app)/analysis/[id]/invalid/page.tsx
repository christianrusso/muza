"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";

const TIPS = [
  { icon: "wb_sunny", label: "Buena luz" },
  { icon: "accessibility_new", label: "Cuerpo completo" },
  { icon: "crop_free", label: "Fondo simple" },
];

function InvalidContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const occasion = searchParams.get("occasion") ?? "other";

  return (
    <div
      className="relative flex min-h-screen flex-col justify-end"
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

      <div className="rounded-t-[28px] bg-card p-6 pt-8">
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-soft">
            <MaterialIcon name="visibility_off" size={30} className="text-coral" />
          </span>
          <div>
            <p className="font-serif text-xl">No pudimos detectar bien tu outfit</p>
            <p className="mt-1 text-sm font-semibold text-muted">
              Seguí estos tips y volvé a intentar
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2.5">
          {TIPS.map((tip) => (
            <div key={tip.label} className="flex flex-col items-center gap-2 rounded-2xl border border-line-strong bg-white p-3">
              <MaterialIcon name={tip.icon} size={22} className="text-coral" />
              <span className="text-center text-xs font-bold">{tip.label}</span>
            </div>
          ))}
        </div>

        <Button onClick={() => router.push(`/analysis/new/capture?occasion=${occasion}`)}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

export default function InvalidPage() {
  return (
    <Suspense>
      <InvalidContent />
    </Suspense>
  );
}
