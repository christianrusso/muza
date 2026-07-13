"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OCCASIONS, occasionVariantGroups } from "@/lib/occasions";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import type { OccasionId } from "@/types/domain";

export function OccasionGrid() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  // variante elegida por grupo (clave = label del grupo, ej. "Momento" → "Noche")
  const [byGroup, setByGroup] = useState<Record<string, string>>({});
  const [context, setContext] = useState("");

  const groups = selected ? occasionVariantGroups(selected as OccasionId) : [];

  function selectOccasion(id: string) {
    setSelected(id);
    setByGroup({}); // al cambiar de ocasión, se resetean variantes y contexto
    setContext("");
  }

  function toggle(groupLabel: string, option: string) {
    setByGroup((cur) => {
      if (cur[groupLabel] === option) {
        const next = { ...cur };
        delete next[groupLabel];
        return next;
      }
      return { ...cur, [groupLabel]: option };
    });
  }

  function handleContinue() {
    const qs = new URLSearchParams({ occasion: selected! });
    // Se juntan las variantes elegidas en orden de grupo (ej. "Noche · Cóctel").
    const variant = groups
      .map((g) => byGroup[g.label])
      .filter(Boolean)
      .join(" · ");
    if (variant) qs.set("variant", variant);
    const ctx = context.trim();
    if (ctx) qs.set("context", ctx);

    track("occasion_selected", {
      occasion_id: selected,
      variant: variant || null,
      has_free_context: Boolean(ctx),
    });

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

      {groups.map((group) => (
        <div key={group.label} className="mt-4">
          <span className="section-label mb-2 block px-1">{group.label} (opcional)</span>
          <div className="flex flex-wrap gap-2">
            {group.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip ${byGroup[group.label] === option ? "active" : ""}`}
                onClick={() => toggle(group.label, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

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
