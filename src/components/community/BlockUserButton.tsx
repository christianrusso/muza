"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BlockUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function block() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/community/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: true }),
      });
      if (!response.ok) throw new Error("block failed");
      router.push("/community");
      router.refresh();
    } catch {
      setError("No se pudo bloquear. Probá de nuevo.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-11 items-center justify-center rounded-full border-2 border-line px-4 text-sm font-extrabold text-muted"
      >
        Bloquear
      </button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-user-title"
            className="w-full max-w-md rounded-3xl bg-paper p-5 shadow-2xl"
          >
            <h2 id="block-user-title" className="font-serif text-2xl text-ink">
              ¿Bloquear a {userName}?
            </h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-muted">
              Los dos dejarán de ver el contenido del otro y se eliminarán los follows entre ustedes.
            </p>
            {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="h-12 flex-1 rounded-full border-2 border-line text-sm font-extrabold text-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={block}
                className="h-12 flex-1 rounded-full bg-coral text-sm font-extrabold text-white disabled:opacity-60"
              >
                {busy ? "Bloqueando..." : "Bloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
