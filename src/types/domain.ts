export type AnalysisType = "completo" | "superior" | "inferior" | "individual";

export type ValidityStatus = "pending" | "valid" | "partial" | "invalid";

export type PlanTier = "free" | "pro";

// Género del usuario para personalizar el scoring. "no_especifica" = el modelo
// infiere de la foto (comportamiento previo, sin línea de género en el prompt).
export type UserGender = "masculino" | "femenino" | "no_especifica";

export const GENDER_OPTIONS: { value: UserGender; label: string; icon: string }[] = [
  { value: "femenino", label: "Femenino", icon: "female" },
  { value: "masculino", label: "Masculino", icon: "male" },
  { value: "no_especifica", label: "Prefiero no decirlo", icon: "block" },
];

export type FeedbackKind = "fortaleza" | "aspecto_mejorar" | "recomendacion";

export type CategoryKey =
  | "ocasion"
  | "fit"
  | "colores"
  | "coherencia"
  | "calzado"
  | "proporciones"
  | "accesorios"
  | "estado_prendas"
  | "modernidad"
  | "originalidad";

export type OccasionId =
  | "casual"
  | "work"
  | "gym"
  | "party"
  | "wedding"
  | "date"
  | "interview"
  | "travel"
  | "other";

export interface AnalysisCategoryRow {
  categoryKey: CategoryKey;
  weight: number;
  score: number;
  justification: string | null;
}

export interface AnalysisFeedbackRow {
  kind: FeedbackKind;
  text: string;
  sortOrder: number;
}

export interface Analysis {
  id: string;
  userId: string;
  occasionId: OccasionId;
  occasionVariant: string | null;
  occasionContext: string | null;
  photoPath: string;
  photoUrl?: string;
  analysisType: AnalysisType;
  validityStatus: ValidityStatus;
  overallScore: number | null;
  qualitativeBadge: string | null;
  styleDescriptors: string[];
  detectedPrendasSuperiores: string[];
  detectedPrendasInferiores: string[];
  detectedCalzado: string[];
  detectedAccesorios: string[];
  detectedColores: string[];
  detectedEstilo: string | null;
  createdAt: string;
  categories: AnalysisCategoryRow[];
  feedback: AnalysisFeedbackRow[];
}
