"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Mock: no hay generación real. Esperamos un momento y mandamos al look de
// ejemplo. `replace` para que "volver" no caiga de nuevo en esta pantalla.
export default function GeneratingLookPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/placard/look/noche-de-fiesta"), 2200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ background: "linear-gradient(180deg,#6b5fe0,#4b3fc9)" }}
    >
      <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/40">
        <MaterialIcon name="auto_awesome" size={40} className="animate-pulse text-white" />
      </span>
      <div className="flex flex-col gap-2">
        <span className="font-serif text-[30px] text-white">Armando tu look…</span>
        <span className="text-sm font-semibold text-white/80">
          Eligiendo prendas y generando la imagen
        </span>
      </div>
    </div>
  );
}
