// Datos de ejemplo del Placard (guardarropa). Es UI-primero: nada de esto viene
// de Supabase todavía. Cuando exista el backend real, estas mismas formas
// (Garment / Look) deberían mapear a las tablas, así las pantallas no cambian.

export type GarmentCategory = "superior" | "inferior" | "vestidos" | "calzado" | "accesorios";

export interface Garment {
  id: string;
  name: string;
  category: GarmentCategory;
  type: string; // subtipo legible: "Camisa", "Jean", "Botas"…
  colors: string[]; // swatches reales de la prenda (para el detalle)
  grad: [string, string]; // gradiente decorativo de la card (de arriba a abajo)
}

export interface Look {
  id: string;
  title: string;
  when: string; // etiqueta relativa mock: "Hoy", "Ayer", "Hace 3 días"
  descriptors: string[]; // ["Elegante", "Equilibrado", "Templado"]
  grad: [string, string];
  garmentIds: string[];
  why: string; // explicación "Por qué funciona"
  coherence: number; // 0-100, coherencia del look para la ocasión
}

export const CATEGORY_LABEL: Record<GarmentCategory, string> = {
  superior: "Superior",
  inferior: "Inferior",
  vestidos: "Vestidos",
  calzado: "Calzado",
  accesorios: "Accesorios",
};

// Orden de los chips de filtro en la grilla.
export const CATEGORY_ORDER: GarmentCategory[] = [
  "superior",
  "inferior",
  "vestidos",
  "calzado",
  "accesorios",
];

export const GARMENTS: Garment[] = [
  {
    id: "remera-blanca",
    name: "Remera blanca",
    category: "superior",
    type: "Remera",
    colors: ["#f2ece1", "#d8c9ad"],
    grad: ["#c69a6b", "#9b6f43"],
  },
  {
    id: "camisa-rayas",
    name: "Camisa a rayas",
    category: "superior",
    type: "Camisa",
    colors: ["#3f5068", "#d8cdb4"],
    grad: ["#b79c82", "#6f5844"],
  },
  {
    id: "sweater-beige",
    name: "Sweater beige",
    category: "superior",
    type: "Sweater",
    colors: ["#d8cbb0", "#b8a888"],
    grad: ["#cdbfa3", "#a08f6f"],
  },
  {
    id: "jean-azul",
    name: "Jean azul",
    category: "inferior",
    type: "Jean",
    colors: ["#3f5266", "#6b8199"],
    grad: ["#6b7c8c", "#3a4653"],
  },
  {
    id: "pantalon-sastrero",
    name: "Pantalón sastrero",
    category: "inferior",
    type: "Pantalón",
    colors: ["#3a3930", "#5a5848"],
    grad: ["#4c4a3f", "#2b2a22"],
  },
  {
    id: "pollera-midi",
    name: "Pollera midi",
    category: "inferior",
    type: "Pollera",
    colors: ["#6f3438", "#93555a"],
    grad: ["#7a3b3f", "#4a2225"],
  },
  {
    id: "vestido-negro",
    name: "Vestido negro",
    category: "vestidos",
    type: "Vestido",
    colors: ["#1e1b17", "#3a352d"],
    grad: ["#2a2622", "#17140f"],
  },
  {
    id: "botas-cuero",
    name: "Botas cuero",
    category: "calzado",
    type: "Botas",
    colors: ["#5a3a24", "#7a5236"],
    grad: ["#6a4326", "#3f2716"],
  },
  {
    id: "zapatillas-blancas",
    name: "Zapatillas blancas",
    category: "calzado",
    type: "Zapatillas",
    colors: ["#eceae4", "#c7c2b6"],
    grad: ["#d5d0c6", "#a7a294"],
  },
  {
    id: "cartera-cognac",
    name: "Cartera cognac",
    category: "accesorios",
    type: "Cartera",
    colors: ["#8a4a2a", "#a9663f"],
    grad: ["#9a5330", "#5f3018"],
  },
  {
    id: "bufanda-oliva",
    name: "Bufanda oliva",
    category: "accesorios",
    type: "Bufanda",
    colors: ["#5f5a2c", "#7c7740"],
    grad: ["#6f6a34", "#40401c"],
  },
  {
    id: "cinturon-cuero",
    name: "Cinturón cuero",
    category: "accesorios",
    type: "Cinturón",
    colors: ["#4a3120", "#6a4a30"],
    grad: ["#5a3d26", "#332114"],
  },
];

export const LOOKS: Look[] = [
  {
    id: "noche-de-fiesta",
    title: "Noche de fiesta",
    when: "Hoy",
    descriptors: ["Elegante", "Equilibrado", "Templado"],
    grad: ["#3a4048", "#1b1d22"],
    garmentIds: ["camisa-rayas", "pantalon-sastrero", "botas-cuero", "cartera-cognac"],
    why: "La camisa a rayas con el pantalón sastrero da un aire elegante pero relajado, ideal para una fiesta. Las botas y la cartera cognac suman calidez y cierran el look con carácter.",
    coherence: 88,
  },
  {
    id: "casual-de-finde",
    title: "Casual de finde",
    when: "Ayer",
    descriptors: ["Relajado", "Cómodo", "Templado"],
    grad: ["#4a5a52", "#2f3a34"],
    garmentIds: ["remera-blanca", "jean-azul", "zapatillas-blancas"],
    why: "La remera blanca con el jean azul es la base más versátil que tenés. Las zapatillas blancas mantienen todo liviano y cómodo para un plan de fin de semana.",
    coherence: 84,
  },
  {
    id: "oficina-otonal",
    title: "Oficina otoñal",
    when: "Hace 3 días",
    descriptors: ["Business casual", "Formal", "Frío"],
    grad: ["#7a5a2a", "#4a3418"],
    garmentIds: ["sweater-beige", "pantalon-sastrero", "botas-cuero"],
    why: "El sweater beige sobre el pantalón sastrero levanta la formalidad sin ser acartonado. Las botas de cuero abrigan y le dan un cierre prolijo para la oficina en días fríos.",
    coherence: 90,
  },
];

export function getGarment(id: string): Garment | undefined {
  return GARMENTS.find((g) => g.id === id);
}

export function getLook(id: string): Look | undefined {
  return LOOKS.find((l) => l.id === id);
}

export function garmentsByCategory(category: GarmentCategory | "all"): Garment[] {
  return category === "all" ? GARMENTS : GARMENTS.filter((g) => g.category === category);
}

export function categoryCount(category: GarmentCategory): number {
  return GARMENTS.filter((g) => g.category === category).length;
}

// Gradiente CSS decorativo, siempre con el mismo ángulo para que la grilla se lea
// pareja.
export function gradientStyle([from, to]: [string, string]): string {
  return `linear-gradient(160deg, ${from} 0%, ${to} 100%)`;
}
