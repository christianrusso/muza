"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Elimina una publicación propia, con confirmación. Al borrar vuelve a Comunidad.
export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/community");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-8 flex items-center justify-center gap-1.5 text-[13px] font-bold text-red"
      >
        <MaterialIcon name="delete" size={18} />
        Eliminar publicación
      </button>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-line p-4 text-center">
      <p className="text-sm font-extrabold text-ink">¿Eliminar esta publicación? No se puede deshacer.</p>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="h-10 rounded-full border border-line px-5 text-sm font-bold text-muted"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="h-10 rounded-full bg-red px-5 text-sm font-extrabold text-white disabled:opacity-60"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
