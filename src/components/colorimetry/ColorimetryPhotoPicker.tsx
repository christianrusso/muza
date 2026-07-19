"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

const TIPS = [
  { icon: "light_mode", text: "Con luz natural, de frente a una ventana" },
  { icon: "face", text: "Rostro descubierto, sin maquillaje pesado" },
  { icon: "checkroom", text: "Sin filtros ni ropa de colores muy saturados cerca de la cara" },
] as const;

export function ColorimetryPhotoPicker() {
  const router = useRouter();
  // Dos inputs y no uno: `capture="user"` abre la cámara frontal directo, y ese
  // atributo no se puede sacar/poner por acción sin que iOS lo ignore. El de
  // galería va sin `capture` justamente para que abra el carrete.
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo.url);
    };
  }, [photo]);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhoto({ file, url: URL.createObjectURL(file) });
    // Se limpia el value para que volver a elegir el mismo archivo dispare change.
    e.target.value = "";
  }

  return (
    <>
      <div className="list-card">
        {TIPS.map((tip) => (
          <div key={tip.icon} className="row">
            <MaterialIcon name={tip.icon} size={22} className="text-[var(--violet)]" />
            <span className="txt text-[15px] leading-snug">{tip.text}</span>
          </div>
        ))}
      </div>

      <input
        ref={selfieInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* La foto va en absolute: si participara del layout, una imagen vertical
          estira el contenedor (flex-1 no achica por debajo del contenido) y
          empuja los botones fuera de la pantalla. */}
      <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed border-line-strong">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt="Foto elegida para la colorimetría"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <span className="flex flex-col items-center gap-2">
            <MaterialIcon name="person" size={64} className="text-faint" />
            <span className="text-sm font-semibold text-faint">Tu foto va a aparecer acá</span>
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          className="btn btn-outline flex-1 text-[15px]"
          onClick={() => selfieInputRef.current?.click()}
        >
          <MaterialIcon name="photo_camera" size={20} className="text-[var(--violet)]" />
          Tomar selfie
        </button>
        <button
          type="button"
          className="btn btn-outline flex-1 text-[15px]"
          onClick={() => galleryInputRef.current?.click()}
        >
          <MaterialIcon name="photo_library" size={20} className="text-[var(--violet)]" />
          Subir desde galería
        </button>
      </div>

      {/* La foto todavía no se sube: el análisis está mockeado. Cuando exista el
          endpoint, acá va el upload y el push pasa a llevar el id real. */}
      <button
        type="button"
        className="btn btn-violet"
        disabled={!photo}
        onClick={() => router.push("/colorimetry/analyzing")}
      >
        Analizar foto
      </button>
    </>
  );
}
