"use client";

import { useEffect, useState } from "react";
import type { ColorimetrySwatch } from "@/types/colorimetry";

export function BestColorsRow({ colors }: { colors: ColorimetrySwatch[] }) {
  // Cuál acaba de copiarse, para confirmar en el lugar del HEX.
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
    } catch {
      // Sin permiso de portapapeles (o contexto no seguro) no hay nada que
      // hacer desde acá: el HEX ya está a la vista para copiarlo a mano.
    }
  }

  return (
    // Scroll horizontal con sangrado: los círculos llegan al borde de la
    // pantalla en vez de cortarse contra el padding, que es lo que insinúa que
    // hay más para el costado.
    <div className="-mx-[22px] flex gap-3.5 overflow-x-auto px-[22px] pb-1">
      {colors.map((color) => (
        <button
          key={color.hex}
          type="button"
          onClick={() => copy(color.hex)}
          className="flex w-[92px] flex-none flex-col items-center gap-2"
        >
          <span
            className="h-[92px] w-[92px] rounded-full"
            style={{ background: color.hex }}
          />
          <span className="text-[15px] font-extrabold">{color.name}</span>
          <span className="text-xs font-semibold text-faint">
            {copied === color.hex ? "¡Copiado!" : color.hex}
          </span>
        </button>
      ))}
    </div>
  );
}
