import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrl } from "@/lib/supabase/photos";
import { isDemoMode, DEMO_USER, DEMO_ANALYSES } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import type { AnalysisType } from "@/types/domain";

export const HOME_HEADLINE_TYPE: AnalysisType = "completo";

export interface HomeLatestAnalysis {
  id: string;
  // Sin tipar como OccasionId acá: viene crudo de la fila de Supabase (string).
  // Se castea a OccasionId en el punto de uso, junto con occasionLabel().
  occasion_id: string;
  overall_score: number | null;
  style_descriptors: string[] | null;
  photoUrl: string | null;
}

export interface HomeData {
  firstName: string;
  avatarUrl: string | null;
  latest: HomeLatestAnalysis | null;
  totalCount: number;
  average: number | null;
}

/** Junta lo que necesita el Home: saludo, último análisis "completo", y stats. */
export async function loadHomeData(): Promise<HomeData> {
  if (isDemoMode()) return loadDemoHomeData();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const { data: validAnalyses } = await supabase
    .from("analyses")
    .select("id, occasion_id, analysis_type, overall_score, style_descriptors, photo_path, created_at")
    .eq("user_id", user!.id)
    .eq("validity_status", "valid")
    .order("created_at", { ascending: false });

  const all = validAnalyses ?? [];
  const scores = all.map((a) => a.overall_score).filter((s): s is number => s !== null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const latestCompleto = all.find((a) => a.analysis_type === HOME_HEADLINE_TYPE);
  const latest = latestCompleto
    ? {
        ...latestCompleto,
        photoUrl: await signedPhotoUrl(supabase, latestCompleto.photo_path, "full"),
      }
    : null;

  return {
    firstName: profile?.full_name?.split(" ")[0] ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    latest,
    totalCount: all.length,
    average,
  };
}

function loadDemoHomeData(): HomeData {
  const created = Array.from(getDemoStore().analyses.values()).filter(
    (a) => a.validityStatus === "valid" && a.overallScore !== null,
  );
  const allScores = [...DEMO_ANALYSES.map((a) => a.overallScore), ...created.map((a) => a.overallScore!)];
  const latest = DEMO_ANALYSES.filter((a) => a.analysisType === HOME_HEADLINE_TYPE).map((a) => ({
    id: a.id,
    occasion_id: a.occasionId,
    overall_score: a.overallScore,
    style_descriptors: a.styleDescriptors,
    photoUrl: null as string | null,
  }))[0];

  return {
    firstName: DEMO_USER.full_name.split(" ")[0],
    avatarUrl: null,
    latest: latest ?? null,
    totalCount: allScores.length,
    average: allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null,
  };
}
