"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { ColorimetryOutfitGroup } from "@/types/colorimetry";

// Se muestra QUÉ PONERSE (texto) al toque; la imagen se genera solo si el usuario
// la pide. Muchos con leer las prendas ya está → no se gasta en imagen (piso $0).
export function OutfitGroupTabs({
  groups,
  initialImages,
}: {
  groups: ColorimetryOutfitGroup[];
  initialImages: Record<string, string | null>;
}) {
  const [activeId, setActiveId] = useState(groups[0]?.id);
  const [images, setImages] = useState<Record<string, string | null>>(initialImages);
  const [generating, setGenerating] = useState<string | null>(null);

  const active = groups.find((g) => g.id === activeId) ?? groups[0];
  const url = active ? images[active.id] : null;
  const isGen = active ? generating === active.id : false;

  async function generate() {
    if (!active || url || generating) return;
    const id = active.id;
    setGenerating(id);
    try {
      const res = await fetch("/api/colorimetry/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "outfit", key: id }),
      });
      const body = await res.json();
      if (res.ok && body.url) setImages((prev) => ({ ...prev, [id]: body.url }));
    } catch {
      // Silencioso: queda el texto; puede reintentar.
    } finally {
      setGenerating((g) => (g === id ? null : g));
    }
  }

  return (
    <>
      <div className="-mx-[22px] mb-3.5 flex gap-2.5 overflow-x-auto px-[22px]">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveId(group.id)}
            className={cn("chip", group.id === active?.id && "active")}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Imagen del look — solo si el usuario la generó. */}
      {(url || isGen) && (
        <div
          className="relative mb-3.5 flex items-center justify-center overflow-hidden rounded-[18px] ph"
          style={{
            aspectRatio: "4 / 3",
            ...(url ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
          }}
        >
          {isGen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <div className="spinner" style={{ width: 30, height: 30, borderTopColor: "var(--violet)" }} />
            </div>
          )}
        </div>
      )}

      {/* Qué ponerse (destacado). Es el valor principal; la imagen es opcional. */}
      <div className="list-card">
        {active?.items.map((item) => (
          <div key={item} className="row">
            <MaterialIcon name="checkroom" size={22} className="text-[var(--violet)]" />
            <span className="txt text-[16px] font-semibold">{item}</span>
          </div>
        ))}
      </div>

      {/* Botón de generar imagen — solo si todavía no está. */}
      {!url && (
        <button type="button" className="btn btn-outline mt-3 text-[15px]" onClick={generate} disabled={isGen}>
          <MaterialIcon name={isGen ? "hourglass_top" : "image"} size={20} className="text-[var(--violet)]" />
          {isGen ? "Generando imagen…" : "Ver imagen del look"}
        </button>
      )}
    </>
  );
}
