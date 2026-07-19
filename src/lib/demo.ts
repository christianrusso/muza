import "server-only";
import type {
  Analysis,
  AnalysisCategoryRow,
  AnalysisFeedbackRow,
  AnalysisType,
  OccasionId,
} from "@/types/domain";
import { SCORE_CATEGORIES } from "@/lib/scoring/categories";
import type { InvalidReason } from "@/lib/ai/schema";

// Active whenever Supabase credentials aren't configured — lets the whole
// app be clicked through locally with in-memory mock data and stubbed AI
// responses instead of a real backend. Never true once NEXT_PUBLIC_SUPABASE_URL
// is set (i.e. never in a real deployment).
export function isDemoMode(): boolean {
  const missingCreds =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Red de seguridad: el modo demo (login falso, datos en memoria, IA stub) JAMÁS
  // debe activarse en producción. Si el build/deploy de prod arranca sin las
  // credenciales de Supabase, fallamos ruidosamente en vez de degradar en
  // silencio a una app falsa. En dev/preview sigue funcionando como antes.
  if (missingCreds && process.env.NODE_ENV === "production") {
    throw new Error(
      "[LookLab] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en producción. " +
        "La app no debe correr en modo demo en prod: configurá las variables de entorno.",
    );
  }
  return missingCreds;
}

export const DEMO_USER = {
  id: "demo-user",
  full_name: "Paula Giménez",
  plan_tier: "free" as const,
  notifications_enabled: true,
};

export interface DemoAnalysis {
  id: string;
  occasionId: OccasionId;
  analysisType: AnalysisType;
  overallScore: number;
  styleDescriptors: string[];
  categories: AnalysisCategoryRow[];
  feedback: AnalysisFeedbackRow[];
  createdAt: string;
}

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

function buildCategories(scores: Record<string, number>): AnalysisCategoryRow[] {
  return SCORE_CATEGORIES.map((c) => ({
    categoryKey: c.key,
    weight: c.weight,
    score: scores[c.key] ?? 75,
    justification: null,
  }));
}

const FEATURED_CATEGORIES: AnalysisCategoryRow[] = SCORE_CATEGORIES.map((c) => {
  const scores: Record<string, { score: number; justification: string | null }> = {
    ocasion: { score: 90, justification: "Perfecta para una cita nocturna; formalidad justa." },
    fit: { score: 84, justification: null },
    colores: { score: 78, justification: "Los colores neutros combinan con equilibrio y elegancia." },
    coherencia: { score: 85, justification: null },
    calzado: { score: 72, justification: null },
    proporciones: { score: 80, justification: null },
    accesorios: { score: 65, justification: "Sumar un accesorio elevaría la originalidad del conjunto." },
    estado_prendas: { score: 88, justification: null },
    modernidad: { score: 76, justification: null },
    originalidad: { score: 70, justification: null },
  };
  return { categoryKey: c.key, weight: c.weight, ...scores[c.key] };
});

const FEATURED_FEEDBACK: AnalysisFeedbackRow[] = [
  { kind: "fortaleza", text: "Excelente combinación de colores neutros", sortOrder: 0 },
  { kind: "fortaleza", text: "El calzado eleva y cierra el look", sortOrder: 1 },
  { kind: "fortaleza", text: "Prendas en muy buen estado", sortOrder: 2 },
  { kind: "aspecto_mejorar", text: "Sumá un accesorio para dar carácter", sortOrder: 0 },
  { kind: "aspecto_mejorar", text: "El fit del pantalón podría ser más entallado", sortOrder: 1 },
  { kind: "aspecto_mejorar", text: "Probá un toque de color en un detalle", sortOrder: 2 },
  { kind: "recomendacion", text: "Agregá un cinturón de cuero", sortOrder: 0 },
  { kind: "recomendacion", text: "Cambiá a zapatos marrones", sortOrder: 1 },
  { kind: "recomendacion", text: "Sumá un reloj minimalista", sortOrder: 2 },
];

export const DEMO_ANALYSES: DemoAnalysis[] = [
  {
    id: "demo-analysis-1",
    occasionId: "date",
    analysisType: "completo",
    overallScore: 82,
    styleDescriptors: ["Casual chic", "Elegante"],
    categories: FEATURED_CATEGORIES,
    feedback: FEATURED_FEEDBACK,
    createdAt: daysAgo(0),
  },
  {
    id: "demo-analysis-2",
    occasionId: "work",
    analysisType: "superior",
    overallScore: 74,
    styleDescriptors: ["Formal"],
    categories: buildCategories({ ocasion: 80, calzado: 70 }),
    feedback: [],
    createdAt: daysAgo(1),
  },
  {
    id: "demo-analysis-3",
    occasionId: "gym",
    analysisType: "inferior",
    overallScore: 68,
    styleDescriptors: ["Deportivo"],
    categories: buildCategories({}),
    feedback: [],
    createdAt: daysAgo(3),
  },
  {
    id: "demo-analysis-4",
    occasionId: "party",
    analysisType: "completo",
    overallScore: 91,
    styleDescriptors: ["Audaz"],
    categories: buildCategories({ ocasion: 95, colores: 92 }),
    feedback: [],
    createdAt: daysAgo(4),
  },
];

export function getDemoAnalysis(id: string): Analysis | null {
  const found = DEMO_ANALYSES.find((a) => a.id === id) ?? DEMO_ANALYSES[0];
  if (!found) return null;
  return {
    id: found.id,
    userId: DEMO_USER.id,
    occasionId: found.occasionId,
    occasionVariant: null,
    occasionContext: null,
    photoPath: "",
    photoUrl: undefined,
    analysisType: found.analysisType,
    validityStatus: "valid",
    overallScore: found.overallScore,
    styleDescriptors: found.styleDescriptors,
    detectedPrendasSuperiores: [],
    detectedPrendasInferiores: [],
    detectedCalzado: [],
    detectedAccesorios: [],
    detectedColores: [],
    detectedEstilo: null,
    createdAt: found.createdAt,
    categories: found.categories,
    feedback: found.feedback,
  };
}

// Deterministic stand-ins for the real OpenAI calls, used only when no
// Supabase project is configured — lets the whole capture -> validate ->
// score flow be clicked through with zero external credentials.
export function buildStubValidationResult() {
  return {
    verdict: "valid" as const,
    analysisType: "completo" as AnalysisType,
    issues: [] as string[],
    partialReason: null as string | null,
    invalidReason: null as InvalidReason | null,
  };
}

export function buildStubScoringResult(occasionLabel: string) {
  return {
    analysisType: "completo" as AnalysisType,
    styleDescriptors: ["Casual chic", "Elegante"],
    occasionContext: occasionLabel,
    categories: FEATURED_CATEGORIES.map((c) => ({
      key: c.categoryKey,
      score: c.score,
      justification: c.justification,
    })),
    detected: {
      prendasSuperiores: ["Camisa blanca"],
      prendasInferiores: ["Pantalón negro"],
      calzado: ["Zapatos de cuero"],
      accesorios: ["Reloj"],
      colores: ["Blanco", "Negro"],
      estilo: "Casual chic",
    },
    strengths: FEATURED_FEEDBACK.filter((f) => f.kind === "fortaleza").map((f) => f.text),
    improvements: FEATURED_FEEDBACK.filter((f) => f.kind === "aspecto_mejorar").map((f) => f.text),
    recommendations: FEATURED_FEEDBACK.filter((f) => f.kind === "recomendacion").map((f) => f.text),
  };
}

export const DEMO_COMMUNITY_POSTS = [
  {
    post_id: "demo-post-1",
    caption: null,
    posted_at: daysAgo(0) as string,
    author_id: "demo-martina",
    author_name: "Martina R.",
    author_avatar_url: null,
    author_gender: "femenino" as const,
    analysis_id: "demo-analysis-4",
    occasion_id: "party" as OccasionId,
    analysis_type: "completo" as AnalysisType,
    overall_score: 88,
    style_descriptors: ["Audaz"],
    like_count: 128,
    dislike_count: 2,
    comment_count: 14,
  },
  {
    post_id: "demo-post-2",
    caption: null,
    posted_at: daysAgo(0) as string,
    author_id: "demo-tomas",
    author_name: "Tomás L.",
    author_avatar_url: null,
    author_gender: "masculino" as const,
    analysis_id: "demo-analysis-2",
    occasion_id: "work" as OccasionId,
    analysis_type: "superior" as AnalysisType,
    overall_score: 76,
    style_descriptors: ["Formal"],
    like_count: 64,
    dislike_count: 0,
    comment_count: 5,
  },
];
