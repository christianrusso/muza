"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OCCASIONS, occasionVariants } from "@/lib/occasions";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";
import type { OccasionId } from "@/types/domain";

export function OccasionGrid() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [context, setContext] = useState("");

  const variants = selected ? occasionVariants(selected as OccasionId) : [];

  function selectOccasion(id: string) {
    setSelected(id);
    setVariant(null); // al cambiar de ocasión, se resetean variante y contexto
    setContext("");
  }

  function handleContinue() {
    const qs = new URLSearchParams({ occasion: selected! });
    if (variant) qs.set("variant", variant);
    const ctx = context.trim();
    if (ctx) qs.set("context", ctx);
    router.push(`/analysis/new/capture?${qs.toString()}`);
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-[11px]">
        {OCCASIONS.map((occasion) => (
          <button
            key={occasion.id}
            type="button"
            className={`occ ${selected === occasion.id ? "sel" : ""}`}
            onClick={() => selectOccasion(occasion.id)}
          >
            <MaterialIcon name={occasion.icon} size={26} />
            <span>{occasion.label}</span>
          </button>
        ))}
      </div>

      {variants.length > 0 && (
        <div className="mt-4">
          <span className="section-label mb-2 block px-1">¿Cuál? (opcional)</span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v}
                type="button"
                className={`chip ${variant === v ? "active" : ""}`}
                onClick={() => setVariant((cur) => (cur === v ? null : v))}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="mt-4">
          <span className="section-label mb-2 block px-1">Contá más (opcional)</span>
          <input
            type="text"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={120}
            placeholder="Ej: cumpleaños infantil, asado, boda en la playa…"
            className="w-full rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-sm font-semibold outline-none placeholder:font-medium placeholder:text-muted focus:border-coral"
          />
        </div>
      )}

      <Button style={{ marginTop: "auto" }} disabled={!selected} onClick={handleContinue}>
        Continuar
      </Button>
    </>
  );
}
