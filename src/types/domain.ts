export type AnalysisType = "completo" | "superior" | "inferior" | "individual";

export type ValidityStatus = "pending" | "valid" | "partial" | "invalid";

export type PlanTier = "free" | "pro";

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
