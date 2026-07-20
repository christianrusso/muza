import { outfitColorsToSwatches } from "@/lib/outfitColors";

// La "paleta del outfit": muestra los colores que la IA detectó en la ropa como
// una fila de swatches de tela. Es la firma visual de la pantalla de resultado —
// convierte un dato que ya existe (detected_colores) en color real y propio de
// cada outfit, en vez de dejar la pantalla en un solo acento de marca.
export function OutfitPalette({ colors }: { colors: string[] }) {
  const swatches = outfitColorsToSwatches(colors);
  if (swatches.length === 0) return null;

  return (
    <div className="palette w-full">
      <span className="section-label mb-3 block px-1">Tu paleta</span>
      <div className="palette-row">
        {swatches.map((s, i) => (
          <div className="palette-chip" key={s.name} style={{ animationDelay: `${i * 45}ms` }}>
            <span
              className={`palette-swatch${s.needsBorder ? " palette-swatch--bordered" : ""}`}
              style={{ background: s.hex }}
            />
            <span className="palette-name">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
