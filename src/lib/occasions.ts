import type { OccasionId } from "@/types/domain";

export interface OccasionDef {
  id: OccasionId;
  label: string;
  icon: string;
  sortOrder: number;
  // Sub-contexto opcional de la ocasión (ej. Fiesta de Día vs Noche). Refina el
  // criterio de la IA sin cambiar el banco de few-shot (que sigue por ocasión).
  variants?: string[];
}

export const OCCASIONS: OccasionDef[] = [
  { id: "casual", label: "Casual", icon: "checkroom", sortOrder: 1 },
  { id: "work", label: "Trabajo", icon: "work", sortOrder: 2, variants: ["Formal", "Casual"] },
  { id: "gym", label: "Gimnasio", icon: "fitness_center", sortOrder: 3 },
  { id: "party", label: "Fiesta", icon: "local_bar", sortOrder: 4, variants: ["Día", "Noche"] },
  { id: "wedding", label: "Casamiento", icon: "diamond", sortOrder: 5, variants: ["Día", "Noche"] },
  { id: "date", label: "Cita", icon: "favorite", sortOrder: 6, variants: ["Informal", "Formal"] },
  { id: "interview", label: "Entrevista", icon: "handshake", sortOrder: 7 },
  { id: "travel", label: "Viaje", icon: "flight", sortOrder: 8 },
  { id: "other", label: "Otro", icon: "more_horiz", sortOrder: 9 },
];

export function occasionLabel(id: OccasionId): string {
  return OCCASIONS.find((o) => o.id === id)?.label ?? id;
}

// Variantes válidas de una ocasión ([] si no tiene).
export function occasionVariants(id: OccasionId): string[] {
  return OCCASIONS.find((o) => o.id === id)?.variants ?? [];
}

// Label completo con la variante entre paréntesis si aplica (ej. "Fiesta · Noche").
export function occasionFullLabel(id: OccasionId, variant?: string | null): string {
  const base = occasionLabel(id);
  return variant && occasionVariants(id).includes(variant) ? `${base} · ${variant}` : base;
}
