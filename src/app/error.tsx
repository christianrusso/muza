"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Error boundary global de la app. En esta versión de Next el prop de reintento
// es `unstable_retry` (no `reset`).
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <MaterialIcon name="sentiment_dissatisfied" size={56} className="text-muted" />
      <div className="flex flex-col gap-1.5">
        <span className="font-serif text-[24px]">Algo salió mal</span>
        <span className="max-w-[280px] text-[13.5px] font-semibold text-muted">
          Tuvimos un problema procesando tu pedido. Probá de nuevo.
        </span>
      </div>
      <div className="flex w-full max-w-[300px] flex-col gap-2.5">
        <button type="button" className="btn btn-primary" onClick={() => unstable_retry()}>
          Reintentar
        </button>
        <Link href="/home" className="btn btn-outline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
