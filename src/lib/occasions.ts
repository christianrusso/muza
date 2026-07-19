import type { OccasionId } from "@/types/domain";

// Un grupo de variantes = una dimensión del contexto (ej. "Momento": Día/Noche).
// Una ocasión puede tener varias (ej. Fiesta: Momento + Tipo). Cada grupo es de
// selección única y opcional.
export interface VariantGroup {
  label: string;
  options: string[];
}

export interface OccasionDef {
  id: OccasionId;
  label: string;
  icon: string;
  sortOrder: number;
  // Sub-contexto opcional por dimensiones. Refina el criterio de la IA sin tocar
  // el banco de few-shot (que sigue indexado por ocasión). Regla: agregar solo
  // variantes que cambian el CÓDIGO DE VESTIMENTA (formalidad/clima/entorno), no
  // la logística (ej. el vehículo de un viaje no cambia qué ponerse; el destino sí).
  variantGroups?: VariantGroup[];
}

export const OCCASIONS: OccasionDef[] = [
  {
    id: "casual",
    label: "Casual",
    icon: "checkroom",
    sortOrder: 1,
    variantGroups: [{ label: "Estilo", options: ["Relajado", "Arreglado"] }],
  },
  {
    id: "work",
    label: "Trabajo",
    icon: "work",
    sortOrder: 2,
    variantGroups: [{ label: "Código", options: ["Formal", "Business casual", "Creativo"] }],
  },
  {
    id: "gym",
    label: "Gimnasio",
    icon: "fitness_center",
    sortOrder: 3,
    variantGroups: [{ label: "Actividad", options: ["Pesas", "Running", "Yoga", "Outdoor"] }],
  },
  {
    id: "party",
    label: "Fiesta",
    icon: "local_bar",
    sortOrder: 4,
    variantGroups: [
      { label: "Momento", options: ["Día", "Noche"] },
      { label: "Tipo", options: ["Casual", "Cóctel", "Boliche"] },
    ],
  },
  {
    id: "wedding",
    label: "Casamiento",
    icon: "diamond",
    sortOrder: 5,
    variantGroups: [
      { label: "Momento", options: ["Día", "Noche"] },
      { label: "Lugar", options: ["Salón", "Jardín", "Playa"] },
    ],
  },
  {
    id: "date",
    label: "Cita",
    icon: "favorite",
    sortOrder: 6,
    variantGroups: [
      { label: "Formalidad", options: ["Informal", "Formal"] },
      { label: "Momento", options: ["Día", "Noche"] },
    ],
  },
  {
    id: "interview",
    label: "Entrevista",
    icon: "handshake",
    sortOrder: 7,
    variantGroups: [{ label: "Rubro", options: ["Corporativo", "Creativo / Startup"] }],
  },
  {
    id: "travel",
    label: "Viaje",
    icon: "flight",
    sortOrder: 8,
    variantGroups: [{ label: "Destino", options: ["Playa", "Ciudad", "Montaña / Frío", "Naturaleza"] }],
  },
  { id: "other", label: "Otro", icon: "more_horiz", sortOrder: 9 },
];

export function occasionLabel(id: OccasionId): string {
  return OCCASIONS.find((o) => o.id === id)?.label ?? id;
}

// Ícono (Material Symbols) de la ocasión, para mostrarlo junto al label.
// Cae a "more_horiz" (el de "Otro") si el id no existe.
export function occasionIcon(id: OccasionId): string {
  return OCCASIONS.find((o) => o.id === id)?.icon ?? "more_horiz";
}

// Grupos de variantes de una ocasión ([] si no tiene).
export function occasionVariantGroups(id: OccasionId): VariantGroup[] {
  return OCCASIONS.find((o) => o.id === id)?.variantGroups ?? [];
}

// Label completo con las variantes elegidas si las hay (ej. "Fiesta · Noche · Cóctel").
// El variant es texto libre armado desde los grupos, así que se agrega tal cual.
export function occasionFullLabel(id: OccasionId, variant?: string | null): string {
  const base = occasionLabel(id);
  return variant ? `${base} · ${variant}` : base;
}
