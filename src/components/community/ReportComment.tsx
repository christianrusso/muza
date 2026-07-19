"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { useGuestGate } from "@/components/community/GuestGate";

type Category = { id: string; slug: string; label: string; sortOrder: number };

export function ReportComment({ commentId, own }: { commentId: string; own: boolean }) {
  const { requireAuth } = useGuestGate();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [observations, setObservations] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || categories.length) return;
    fetch("/api/community/comment-report-categories").then((r) => r.json()).then((json) => setCategories(json.data ?? [])).catch(() => setMessage("No se pudieron cargar las categorías."));
  }, [open, categories.length]);

  function start() {
    if (own) return;
    if (requireAuth("report")) setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const category = categories.find((c) => c.id === categoryId);
    if (!category || (category.slug === "other" && !observations.trim())) { setMessage("Elegí una categoría y completá las observaciones si seleccionaste Otro."); return; }
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/community/comments/${commentId}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId, observations }) });
    const json = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) { setMessage(json?.error?.message ?? "No se pudo enviar el reporte."); return; }
    setOpen(false); setMessage("Reporte recibido"); setCategoryId(""); setObservations("");
    setTimeout(() => setMessage(null), 2500);
  }

  return <>
    {!own && <button type="button" onClick={start} aria-label="Reportar comentario" className="text-faint hover:text-ink">⋯</button>}
    {message && !open && <span className="ml-2 text-xs font-bold text-muted">{message}</span>}
    {open && <>
      <div className="fixed inset-0 z-[59] bg-black/45" onClick={() => !busy && setOpen(false)} aria-hidden />
      <BottomSheet role="dialog" aria-modal="true" aria-label="Reportar comentario">
        <h2 className="font-serif text-2xl text-ink">Reportar comentario</h2>
        <p className="mt-1 text-sm font-semibold text-muted">Tu reporte es anónimo para quien comentó.</p>
        <form onSubmit={submit} className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-faint">Motivo</label>
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink">
            <option value="">Elegí una categoría</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <textarea value={observations} onChange={(e) => setObservations(e.target.value)} maxLength={1000} placeholder="Observaciones (opcional)" className="mt-3 min-h-24 w-full rounded-xl border border-line bg-paper p-3 text-sm text-ink" />
          {message && <p className="mt-2 text-xs font-semibold text-red">{message}</p>}
          <Button type="submit" disabled={busy} className="mt-4 w-full">{busy ? "Enviando…" : "Enviar reporte"}</Button>
          <button type="button" disabled={busy} onClick={() => setOpen(false)} className="mt-2 h-10 w-full text-sm font-bold text-faint">Cancelar</button>
        </form>
      </BottomSheet>
    </>}
  </>;
}
