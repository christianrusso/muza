"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function BlockButton({
  userId,
  name,
  blocked,
}: {
  userId: string;
  name: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const action = blocked ? "desbloquear" : "bloquear";
    if (!confirm(`¿Seguro que querés ${action} a ${name}?`)) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/admin/api/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: !blocked }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `No se pudo ${action}.`);
        return;
      }
      // refresh() vuelve a correr el server component y repinta la fila con el
      // estado nuevo, sin perder el filtro de búsqueda de la URL.
      startTransition(() => router.refresh());
    } catch {
      setError("Error de red. Probá de nuevo.");
    } finally {
      setSending(false);
    }
  }

  const busy = sending || pending;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={busy}
        className={
          blocked
            ? "rounded-lg border border-line-strong px-3 py-1.5 text-xs font-medium text-muted transition hover:text-ink disabled:opacity-50"
            : "rounded-lg bg-red-soft px-3 py-1.5 text-xs font-medium text-red transition hover:brightness-95 disabled:opacity-50"
        }
      >
        {busy ? "..." : blocked ? "Desbloquear" : "Bloquear"}
      </button>
      {error && <span className="max-w-40 text-right text-[10px] text-red">{error}</span>}
    </div>
  );
}
