// Mapea los nombres de color que detecta la IA (`detected_colores`, en español)
// a un hex para poder pintar la paleta del outfit en pantalla. La paleta elegida
// es deliberadamente algo desaturada (tono editorial/moda), no colores primarios
// de crayón. Ver src/components/analysis/OutfitPalette.tsx.

// Orden importa: las claves más específicas van primero para que "azul marino"
// no matchee con "azul", "verde oliva" no matchee con "verde", etc.
const COLOR_TABLE: Array<[string[], string]> = [
  [["azul marino", "marino", "navy"], "#2a3a57"],
  [["celeste"], "#8fb6d6"],
  [["denim"], "#4a648c"],
  [["azul"], "#3f5c8a"],
  [["negro"], "#1c1a17"],
  [["blanco"], "#f3efe7"],
  [["gris oscuro", "plomo"], "#5c5850"],
  [["gris claro", "gris perla"], "#cfcabf"],
  [["gris"], "#9b968c"],
  [["beige", "arena"], "#d8c7a8"],
  [["crema", "marfil"], "#ece3d0"],
  [["camel"], "#b5895a"],
  [["terracota", "ladrillo"], "#c06846"],
  [["marron", "cafe", "chocolate", "tostado"], "#6f4e37"],
  [["bordo", "vinotinto", "borgona", "burdeos", "guinda"], "#6e2331"],
  [["rojo"], "#b23a3a"],
  [["rosa palo", "rosa viejo"], "#e2b8bf"],
  [["rosa"], "#d98aa0"],
  [["fucsia", "magenta"], "#c0417f"],
  [["coral", "salmon"], "#e2795f"],
  [["naranja"], "#d1732f"],
  [["mostaza"], "#c99a2e"],
  [["amarillo"], "#e0b83f"],
  [["dorado", "oro"], "#c9a44a"],
  [["verde oliva", "oliva"], "#6b6b3a"],
  [["verde militar", "militar"], "#4a5335"],
  [["verde agua", "menta"], "#8fc0a9"],
  [["verde"], "#4c7a52"],
  [["turquesa"], "#3fa6a0"],
  [["violeta", "morado", "lila", "purpura"], "#6b5aa6"],
  [["plateado", "plata"], "#b9b7b0"],
];

const FALLBACK_HEX = "#b0aaa0";

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca acentos (marcas diacríticas combinantes)
    .trim();
}

/** Luminancia relativa 0-1 de un hex, para decidir si un swatch necesita borde. */
function luminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface OutfitSwatch {
  /** El nombre original tal cual lo detectó la IA, para mostrar al usuario. */
  name: string;
  hex: string;
  /** true para colores muy claros que se perderían contra el fondo claro. */
  needsBorder: boolean;
}

/** Convierte un nombre de color (español) en un swatch pintable. */
export function outfitColorToSwatch(name: string): OutfitSwatch {
  const norm = normalize(name);
  const match = COLOR_TABLE.find(([keys]) => keys.some((k) => norm.includes(k)));
  const hex = match ? match[1] : FALLBACK_HEX;
  return { name, hex, needsBorder: luminance(hex) > 0.82 };
}

/** Convierte la lista de colores detectados en swatches, sin duplicados. */
export function outfitColorsToSwatches(names: string[]): OutfitSwatch[] {
  const seen = new Set<string>();
  const out: OutfitSwatch[] = [];
  for (const name of names) {
    const key = normalize(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(outfitColorToSwatch(name));
  }
  return out;
}
