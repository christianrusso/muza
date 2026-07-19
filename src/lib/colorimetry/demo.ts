import type { Colorimetry } from "@/types/colorimetry";

// Resultado fijo mientras no hay IA ni persistencia detrás: sirve para armar y
// revisar la pantalla. Cuando exista el endpoint, este objeto se reemplaza por
// lo que devuelva el análisis — la forma del tipo ya es la definitiva.
export const DEMO_COLORIMETRY: Colorimetry = {
  season: "Otoño Oscuro",
  traits: [
    { label: "Cálida", dot: "#E8A33D" },
    { label: "Oscura", dot: "#FFFFFF" },
    { label: "Brillante", dot: "#A78BFA" },
  ],
  subtone: "Cálido",
  contrast: "Alto",
  depth: "Rica",
  bestColors: [
    { name: "Terracota", hex: "#8A3B24" },
    { name: "Oliva", hex: "#4E5B31" },
    { name: "Mostaza", hex: "#8C6B2F" },
    { name: "Chocolate", hex: "#5C3A21" },
    { name: "Bosque", hex: "#2C4F3E" },
  ],
  palette: [
    { name: "Terracota", hex: "#8A3B24" },
    { name: "Castaño", hex: "#6B4A2F" },
    { name: "Oliva", hex: "#4E5B31" },
    { name: "Mostaza", hex: "#8C6B2F" },
    { name: "Ladrillo", hex: "#7A2E2E" },
    { name: "Musgo", hex: "#3C3A2C" },
    { name: "Canela", hex: "#B57A2E" },
    { name: "Chocolate", hex: "#5C3A21" },
    { name: "Bronce", hex: "#8A7231" },
    { name: "Bosque", hex: "#2C4F3E" },
  ],
  outfitGroups: [
    { id: "basicos", label: "Básicos", items: ["Remera", "Pantalón", "Sweater"] },
    { id: "elevados", label: "Elevados", items: ["Blazer", "Camisa de seda", "Abrigo largo"] },
    { id: "casual", label: "Casual", items: ["Buzo", "Jean", "Camisa de lino"] },
    { id: "formal", label: "Formal", items: ["Traje", "Camisa", "Zapatos de cuero"] },
  ],
  accessories: [
    { icon: "visibility", title: "Anteojos", advice: "Marcos cálidos, carey o dorado mate" },
    { icon: "steps", title: "Calzado & cinturones", advice: "Marrón, cognac o borgoña" },
    { icon: "watch", title: "Joyería", advice: "Oro antiguo o bronce" },
    { icon: "checkroom", title: "Bufandas & gorros", advice: "Tonos tierra u oliva" },
  ],
  looks: ["Casual cálido", "Oficina otoñal", "Noche elegante", "Fin de semana"],
  avoid: [
    "Colores fríos y apagados como gris azulado o blanco puro",
    "Negro cerca del rostro, resta luminosidad",
    "Plata y metales fríos en joyería",
  ],
  combine: [
    "Combiná tonos tierra entre sí para una armonía natural",
    "Sumá un color de contraste cálido, como mostaza, para dar foco",
    "Cabello y joyería dorados potencian tu paleta",
  ],
};
