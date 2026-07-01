import type { OccasionId } from "@/types/domain";

export interface OccasionDef {
  id: OccasionId;
  label: string;
  icon: string;
  sortOrder: number;
}

export const OCCASIONS: OccasionDef[] = [
  { id: "casual", label: "Casual", icon: "checkroom", sortOrder: 1 },
  { id: "work", label: "Trabajo", icon: "work", sortOrder: 2 },
  { id: "gym", label: "Gimnasio", icon: "fitness_center", sortOrder: 3 },
  { id: "party", label: "Fiesta", icon: "local_bar", sortOrder: 4 },
  { id: "wedding", label: "Casamiento", icon: "diamond", sortOrder: 5 },
  { id: "date", label: "Cita", icon: "favorite", sortOrder: 6 },
  { id: "interview", label: "Entrevista", icon: "handshake", sortOrder: 7 },
  { id: "travel", label: "Viaje", icon: "flight", sortOrder: 8 },
  { id: "other", label: "Otro", icon: "more_horiz", sortOrder: 9 },
];

export function occasionLabel(id: OccasionId): string {
  return OCCASIONS.find((o) => o.id === id)?.label ?? id;
}
