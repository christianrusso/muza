"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";

type Tip = { icon: string; label: string };

type Variant = {
  icon: string;
  title: string;
  subtitle: string;
  /** Vacío a propósito: los tips de foto solo aplican si la falla es de foto. */
  tips: Tip[];
  cta: string;
};

const TIPS_FOTO: Tip[] = [
  { icon: "wb_sunny", label: "Buena luz" },
  { icon: "center_focus_strong", label: "Foto nítida" },
  { icon: "crop_free", label: "Fondo simple" },
];

const TIPS_ENCUADRE: Tip[] = [
  { icon: "accessibility_new", label: "Cuerpo completo" },
  { icon: "visibility", label: "Ropa a la vista" },
  { icon: "crop_free", label: "Fondo simple" },
];

/**
 * El motivo viene del validador (InvalidReason). Antes esta pantalla mostraba
 * un único mensaje de calidad de foto para todo: a quien subía un plato de
 * comida se le pedía mejorar la iluminación, que no le dice nada sobre qué
 * hacer distinto. Cada motivo describe SU problema y muestra solo los tips
 * que aplican.
 */
const VARIANTS: Record<string, Variant> = {
  not_outfit: {
    icon: "image_not_supported",
    title: "Esto no parece un outfit",
    subtitle: "Probá con una foto tuya vestido, o de una prenda sola.",
    tips: [],
    cta: "Subir otra foto",
  },
  no_clothing_visible: {
    icon: "checkroom",
    title: "No encontramos ropa para analizar",
    subtitle: "Probá con una foto donde se vea el outfit puesto.",
    tips: [],
    cta: "Subir otra foto",
  },
  occluded: {
    icon: "visibility_off",
    title: "La ropa quedó tapada",
    subtitle: "Se ve algo de vestimenta, pero no lo suficiente para analizarla.",
    tips: TIPS_ENCUADRE,
    cta: "Reintentar",
  },
  photo_quality: {
    icon: "filter_center_focus",
    title: "La foto no se ve bien",
    subtitle: "El outfit está, pero no llegamos a distinguir las prendas.",
    tips: TIPS_FOTO,
    cta: "Reintentar",
  },
  // No es una foto rechazada: se cayó la validación. Decirle a esta persona que
  // mejore la luz sería mentirle sobre qué pasó.
  service_error: {
    icon: "cloud_off",
    title: "No pudimos analizar tu foto",
    subtitle: "Hubo un problema de nuestro lado. Tu foto estaba bien: probá de nuevo en un momento.",
    tips: [],
    cta: "Reintentar",
  },
};

// Si el modelo devuelve null o algo fuera del enum, caemos al mensaje viejo:
// genérico, pero sin afirmar un motivo que no sabemos.
const FALLBACK: Variant = {
  icon: "visibility_off",
  title: "No pudimos detectar bien tu outfit",
  subtitle: "Seguí estos tips y volvé a intentar",
  tips: TIPS_FOTO,
  cta: "Reintentar",
};

function InvalidContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const occasion = searchParams.get("occasion") ?? "other";
  const reason = searchParams.get("reason") ?? "";
  const variant = VARIANTS[reason] ?? FALLBACK;

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
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-soft">
            <MaterialIcon name={variant.icon} size={30} className="text-coral" />
          </span>
          <div>
            <p className="font-serif text-xl">{variant.title}</p>
            <p className="mt-1 text-sm font-semibold text-muted">{variant.subtitle}</p>
          </div>
        </div>

        {variant.tips.length > 0 && (
          <div className="mb-5 grid grid-cols-3 gap-2.5">
            {variant.tips.map((tip) => (
              <div key={tip.label} className="flex flex-col items-center gap-2 rounded-2xl border border-line-strong bg-white p-3">
                <MaterialIcon name={tip.icon} size={22} className="text-coral" />
                <span className="text-center text-xs font-bold">{tip.label}</span>
              </div>
            ))}
          </div>
        )}

        <Button onClick={() => router.push(`/analysis/new/capture?occasion=${occasion}`)}>
          {variant.cta}
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
