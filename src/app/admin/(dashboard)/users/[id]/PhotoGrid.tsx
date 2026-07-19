"use client";

import { format, parseISO } from "date-fns";

// Misma razon que en la ficha: una fecha invalida en UNA foto no puede tumbar
// la grilla entera con "Algo salio mal".
function fmtDate(iso: string | null | undefined, pattern: string): string {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    return Number.isNaN(d.getTime()) ? "—" : format(d, pattern);
  } catch {
    return "—";
  }
}
import { useEffect, useState } from "react";
import type { AdminUserAnalysis } from "@/lib/admin/users";

function scoreColor(score: number | null): string {
  if (score === null) return "text-faint";
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-medium";
  return "text-score-low";
}

export function PhotoGrid({ analyses }: { analyses: AdminUserAnalysis[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : analyses[openIndex];

  // Escape cierra el visor; las flechas se mueven entre fotos.
  useEffect(() => {
    if (openIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : Math.min(i + 1, analyses.length - 1)));
      if (e.key === "ArrowLeft") setOpenIndex((i) => (i === null ? i : Math.max(i - 1, 0)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, analyses.length]);

  if (analyses.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-10 text-center">
        <p className="text-sm text-faint">Este usuario todavía no subió ninguna foto.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {analyses.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setOpenIndex(i)}
            className="group overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:border-line-strong"
          >
            <div className="relative aspect-[3/4] bg-paper">
              {a.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.thumbUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-faint">
                  Sin foto
                </span>
              )}
              {a.post_id && (
                <span className="absolute left-2 top-2 rounded bg-coral px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  En comunidad
                </span>
              )}
              {a.validity_status !== "valid" && (
                <span className="absolute right-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  {a.validity_status}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">{a.occasion}</p>
                <p className="text-[11px] text-faint">
                  {fmtDate(a.created_at, "dd/MM/yy")}
                </p>
              </div>
              <span className={`shrink-0 text-sm font-semibold tabular-nums ${scoreColor(a.overall_score)}`}>
                {a.overall_score ?? "—"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto del usuario"
          onClick={() => setOpenIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-deep/85 p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card"
          >
            <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {open.occasion}
                  {open.analysis_type && <span className="text-faint"> · {open.analysis_type}</span>}
                </p>
                <p className="text-xs text-faint">
                  {fmtDate(open.created_at, "dd/MM/yyyy HH:mm")}
                  {open.post_id && ` · publicada · ♥ ${open.post_likes}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold tabular-nums ${scoreColor(open.overall_score)}`}>
                  {open.overall_score ?? "—"}
                </span>
                <button
                  onClick={() => setOpenIndex(null)}
                  aria-label="Cerrar"
                  className="rounded-lg border border-line-strong px-2.5 py-1 text-sm text-muted transition hover:text-ink"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-paper p-3">
              {open.fullUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={open.fullUrl} alt="" className="max-h-[65vh] w-auto rounded-lg object-contain" />
              ) : (
                <p className="py-20 text-sm text-faint">No se pudo cargar la foto.</p>
              )}
            </div>

            {open.caption?.trim() && (
              <p className="border-t border-line px-4 py-2 text-xs text-muted">“{open.caption.trim()}”</p>
            )}

            <div className="flex items-center justify-between border-t border-line px-4 py-2">
              <button
                onClick={() => setOpenIndex((i) => Math.max((i ?? 0) - 1, 0))}
                disabled={openIndex === 0}
                className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-ink disabled:opacity-30"
              >
                ← Anterior
              </button>
              <span className="text-xs tabular-nums text-faint">
                {(openIndex ?? 0) + 1} / {analyses.length}
              </span>
              <button
                onClick={() => setOpenIndex((i) => Math.min((i ?? 0) + 1, analyses.length - 1))}
                disabled={openIndex === analyses.length - 1}
                className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-ink disabled:opacity-30"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
