"use client";
import { useState } from "react";

export function ResolveReportButton({ id, status }: { id: string; status: "confirmed" | "dismissed" | "pending" }) {
  const [busy, setBusy] = useState(false);
  async function resolve(next: "confirmed" | "dismissed") {
    if (!window.confirm(next === "confirmed" ? "¿Confirmar y ocultar este comentario?" : "¿Descartar este reporte?")) return;
    setBusy(true);
    const response = await fetch(`/admin/api/comment-reports/${id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    setBusy(false);
    if (!response.ok) { window.alert("No se pudo resolver. Actualizá la página e intentá de nuevo."); return; }
    window.location.reload();
  }
  if (status !== "pending") return <span className="text-xs text-faint">Resuelto</span>;
  return <div className="flex gap-2"><button disabled={busy} onClick={() => resolve("confirmed")} className="rounded-lg bg-coral px-3 py-1.5 text-xs font-bold text-white">Confirmar</button><button disabled={busy} onClick={() => resolve("dismissed")} className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-bold text-muted">Descartar</button></div>;
}
