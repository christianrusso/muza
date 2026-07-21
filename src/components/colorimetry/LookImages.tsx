"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

const MAX_SELECT = 2;

// Looks a elección: se muestran los nombres; el usuario elige hasta 2 y los
// genera (para no gastar en imágenes que no va a mirar). Los ya generados se
// muestran directo.
export function LookImages({ looks, initialUrls }: { looks: string[]; initialUrls: (string | null)[] }) {
  const [urls, setUrls] = useState<(string | null)[]>(initialUrls);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  function toggle(i: number) {
    if (urls[i] || generating) return; // ya generado o generando → no se toca
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < MAX_SELECT) next.add(i);
      return next;
    });
  }

  async function generate() {
    if (!selected.size) return;
    setGenerating(true);
    const idxs = [...selected];
    const results = await Promise.all(
      idxs.map(async (i) => {
        try {
          const res = await fetch("/api/colorimetry/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: "look", key: String(i) }),
          });
          const body = await res.json();
          return { i, url: res.ok ? (body.url ?? null) : null };
        } catch {
          return { i, url: null };
        }
      }),
    );
    setUrls((prev) => {
      const next = prev.slice();
      for (const { i, url } of results) if (url) next[i] = url;
      return next;
    });
    setSelected(new Set());
    setGenerating(false);
  }

  const pendingCount = selected.size;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {looks.map((look, i) => {
          const url = urls[i] ?? null;
          const isSelected = selected.has(i);
          const isGen = generating && isSelected;
          return (
            <button
              key={look}
              type="button"
              onClick={() => toggle(i)}
              disabled={!!url || generating}
              className={`relative flex items-end overflow-hidden rounded-[18px] p-3 text-left ${
                i % 2 === 0 ? "ph" : "ph-2"
              } ${isSelected ? "ring-2 ring-[var(--violet)]" : ""}`}
              style={{
                aspectRatio: "3 / 4",
                ...(url
                  ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : {}),
              }}
            >
              {/* Check de selección (solo en los no generados). */}
              {!url && (
                <span
                  className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full ${
                    isSelected ? "bg-[var(--violet)] text-white" : "bg-black/25 text-white/80"
                  }`}
                >
                  <MaterialIcon name={isSelected ? "check" : "add"} size={16} />
                </span>
              )}
              {isGen && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <div className="spinner" style={{ width: 28, height: 28, borderTopColor: "var(--violet)" }} />
                </div>
              )}
              <span
                className="relative text-[15px] font-semibold text-white/90"
                style={url ? { textShadow: "0 1px 4px rgba(0,0,0,.6)" } : undefined}
              >
                {look}
              </span>
            </button>
          );
        })}
      </div>

      {pendingCount > 0 && (
        <button type="button" className="btn btn-violet mt-3" onClick={generate} disabled={generating}>
          <MaterialIcon name={generating ? "hourglass_top" : "auto_awesome"} size={20} />
          {generating ? "Generando…" : `Generar ${pendingCount} look${pendingCount > 1 ? "s" : ""}`}
        </button>
      )}
      {pendingCount === 0 && !urls.some(Boolean) && (
        <p className="mt-2.5 px-1 text-xs font-semibold text-faint">
          Elegí hasta {MAX_SELECT} y generalos.
        </p>
      )}
    </>
  );
}
