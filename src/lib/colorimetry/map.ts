import type { ColorimetryResult } from "@/lib/ai/schema";
import type { Colorimetry } from "@/types/colorimetry";

// Las 4 categorías fijas de accesorios: ícono + título los fija el código (el
// modelo solo escribe el consejo), así no se rompe el ícono con un nombre inventado.
const ACCESSORY_SLOTS = [
  { key: "anteojos", icon: "visibility", title: "Anteojos" },
  { key: "calzado", icon: "steps", title: "Calzado & cinturones" },
  { key: "joyeria", icon: "watch", title: "Joyería" },
  { key: "bufandas", icon: "checkroom", title: "Bufandas & gorros" },
] as const;

// slug simple y estable para el id del grupo de outfit (la UI lo usa de key).
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Convierte la salida cruda del modelo en el objeto Colorimetry que renderiza y
// persiste la app. Puro (sin I/O): testeable y reutilizable.
export function toColorimetry(r: ColorimetryResult): Colorimetry {
  return {
    season: r.season,
    subtone: r.subtone,
    contrast: r.contrast,
    depth: r.depth,
    traits: r.traits.map((t) => ({ label: t.label, dot: t.hex })),
    bestColors: r.bestColors,
    palette: r.palette,
    outfitGroups: r.outfitGroups.map((g, i) => ({
      id: slug(g.label) || `grupo-${i}`,
      label: g.label,
      items: g.items,
    })),
    accessories: ACCESSORY_SLOTS.map((slot) => ({
      icon: slot.icon,
      title: slot.title,
      advice: r.accessories[slot.key],
    })),
    looks: r.looks,
    avoid: r.avoid,
    combine: r.combine,
  };
}
