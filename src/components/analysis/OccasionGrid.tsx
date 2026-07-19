"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OCCASIONS, occasionVariantGroups } from "@/lib/occasions";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import type { OccasionId } from "@/types/domain";

// Tope del texto libre. Tiene que coincidir con el max() del schema de
// /api/analyses: si el campo permitiera más de lo que la API acepta, el análisis
// fallaría recién al crearse, después de que la persona ya escribió y sacó la foto.
const CONTEXT_MAX = 250;

export function OccasionGrid() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  // variante elegida por grupo (clave = label del grupo, ej. "Momento" → "Noche")
  const [byGroup, setByGroup] = useState<Record<string, string>>({});
  const [context, setContext] = useState("");

  const groups = selected ? occasionVariantGroups(selected as OccasionId) : [];
  // "Otro" no dice nada por sí solo: sin el texto libre, la IA no tiene contra qué
  // evaluar la adecuación (que es la categoría de mayor peso). Ahí es obligatorio.
  const contextRequired = selected === "other";
  const contextOk = !contextRequired || context.trim().length > 0;

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
    // El botón ya viene deshabilitado, pero no dependemos solo de eso.
    if (!selected || !contextOk) return;
    const qs = new URLSearchParams({ occasion: selected });
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
          <div className="mb-2 flex items-baseline justify-between px-1">
            <span className="section-label">
              Contá más {contextRequired ? "(obligatorio)" : "(opcional)"}
            </span>
            <span className="text-[11px] font-semibold text-faint">
              {context.length}/{CONTEXT_MAX}
            </span>
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={CONTEXT_MAX}
            rows={3}
            placeholder={
              contextRequired
                ? "Contanos para qué es: ej. cumpleaños infantil, asado con amigos, primera comunión…"
                : "Ej: cumpleaños infantil, asado, boda en la playa…"
            }
            className="w-full resize-none rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-sm font-semibold leading-snug outline-none placeholder:font-medium placeholder:text-muted focus:border-coral"
          />
          {contextRequired && (
            <p className="mt-1.5 px-1 text-[13px] font-semibold text-muted">
              Como elegiste “Otro”, necesitamos saber para qué ocasión es: sin eso la IA no
              puede evaluar si el look es adecuado.
            </p>
          )}
        </div>
      )}

      <Button
        style={{ marginTop: "auto" }}
        disabled={!selected || !contextOk}
        onClick={handleContinue}
      >
        Continuar
      </Button>
    </>
  );
}
