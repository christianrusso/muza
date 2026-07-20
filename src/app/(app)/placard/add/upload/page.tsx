"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";

export default function UploadGarmentPage() {
  const router = useRouter();
  // Mock: no hay foto real. "Cámara"/"Galería" simulan la carga para poder
  // recorrer el flujo hasta guardar.
  const [hasPhoto, setHasPhoto] = useState(false);

  return (
    <div className="screen-body pad">
      <ScreenHead title="Subir una prenda" backHref="/placard/add" />

      <div
        className="flex flex-1 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-line-strong"
        style={hasPhoto ? { background: "linear-gradient(160deg,#cdbfa3,#9b8a6a)" } : undefined}
      >
        {hasPhoto ? (
          <MaterialIcon name="checkroom" size={96} className="text-white/40" />
        ) : (
          <span className="flex flex-col items-center gap-3 px-8 text-center">
            <MaterialIcon name="checkroom" size={44} className="text-faint" />
            <span className="text-sm font-semibold text-muted">Foto de la prenda sobre fondo claro</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => setHasPhoto(true)}>
          <MaterialIcon name="photo_camera" size={20} className="text-[var(--violet)]" />
          Cámara
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setHasPhoto(true)}>
          <MaterialIcon name="photo_library" size={20} className="text-[var(--violet)]" />
          Galería
        </Button>
      </div>

      <Button
        className="btn-violet mt-3"
        disabled={!hasPhoto}
        onClick={() => router.push("/placard")}
      >
        <MaterialIcon name="check" size={20} />
        Guardar en el placard
      </Button>
    </div>
  );
}
