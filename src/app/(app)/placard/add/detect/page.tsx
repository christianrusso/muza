"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";

const TIPS = [
  { icon: "accessibility_new", text: "De cuerpo entero, de frente" },
  { icon: "wb_sunny", text: "Con buena luz y fondo simple" },
  { icon: "checkroom", text: "Detectamos cada prenda por separado" },
];

export default function DetectGarmentsPage() {
  const router = useRouter();
  const [hasPhoto, setHasPhoto] = useState(false);

  return (
    <div className="screen-body pad">
      <ScreenHead title="Foto de cuerpo" backHref="/placard/add" />

      <div className="list-card">
        {TIPS.map((t) => (
          <div key={t.text} className="row">
            <MaterialIcon name={t.icon} className="text-[var(--violet)]" />
            <span className="txt">{t.text}</span>
          </div>
        ))}
      </div>

      <div
        className="mt-2 flex flex-1 items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-line-strong"
        style={hasPhoto ? { background: "linear-gradient(160deg,#5a6572,#333c46)" } : undefined}
      >
        {hasPhoto ? (
          <MaterialIcon name="person" size={96} className="text-white/40" />
        ) : (
          <span className="flex flex-col items-center gap-3 px-8 text-center">
            <MaterialIcon name="person" size={44} className="text-faint" />
            <span className="text-sm font-semibold text-muted">Tu foto va a aparecer acá</span>
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
        <MaterialIcon name="search" size={20} />
        Detectar prendas
      </Button>
    </div>
  );
}
