"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { ColorimetryOutfitGroup } from "@/types/colorimetry";

// Un flat-lay por grupo, generado lazy: el primero ("Básicos") al abrir, el resto
// al tocar el tab. Así se paga solo por lo que el usuario mira.
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
  // Grupos que ya se intentaron generar (evita re-disparar en cada render).
  const attempted = useRef<Set<string>>(new Set(Object.keys(initialImages).filter((k) => initialImages[k])));

  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  useEffect(() => {
    if (!active) return;
    const id = active.id;
    if (images[id] || attempted.current.has(id) || generating) return;
    attempted.current.add(id);
    setGenerating(id);
    (async () => {
      try {
        const res = await fetch("/api/colorimetry/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: "outfit", key: id }),
        });
        const body = await res.json();
        if (res.ok && body.url) setImages((prev) => ({ ...prev, [id]: body.url }));
      } catch {
        // Silencioso: queda el placeholder; se reintenta al re-tocar (sacamos el attempted).
        attempted.current.delete(id);
      } finally {
        setGenerating((g) => (g === id ? null : g));
      }
    })();
  }, [active, images, generating]);

  const url = active ? images[active.id] : null;
  const isGen = active ? generating === active.id : false;

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

      <div
        className="relative flex items-end overflow-hidden rounded-[18px] p-3 ph"
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
        {!url && !isGen && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MaterialIcon name="checkroom" size={40} className="text-faint" />
          </div>
        )}
      </div>

      {/* Prendas del grupo, como texto (la imagen es el flat-lay del conjunto). */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {active?.items.map((item) => (
          <span
            key={item}
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-muted"
            style={{ background: "var(--violet-soft)" }}
          >
            {item}
          </span>
        ))}
      </div>
    </>
  );
}
