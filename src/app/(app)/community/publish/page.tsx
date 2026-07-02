import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_ANALYSES } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { ScreenHead } from "@/components/navigation/TopBar";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { PublishButton } from "@/components/community/PublishButton";
import type { AnalysisType, OccasionId } from "@/types/domain";

interface EligibleAnalysis {
  id: string;
  occasion_id: string;
  analysis_type: AnalysisType;
  overall_score: number;
  photoUrl: string | null;
}

async function loadEligibleAnalyses(): Promise<EligibleAnalysis[]> {
  if (isDemoMode()) {
    const store = getDemoStore();
    const postedAnalysisIds = new Set(Array.from(store.posts.values()).map((p) => p.analysisId));
    const created = Array.from(store.analyses.values())
      .filter((a) => a.validityStatus === "valid" && a.overallScore !== null && !postedAnalysisIds.has(a.id))
      .map((a) => ({
        id: a.id,
        occasion_id: a.occasionId,
        analysis_type: a.analysisType ?? "completo",
        overall_score: a.overallScore!,
        photoUrl: a.photoDataUrl,
      }));
    const seeded = DEMO_ANALYSES.filter((a) => !postedAnalysisIds.has(a.id)).map((a) => ({
      id: a.id,
      occasion_id: a.occasionId,
      analysis_type: a.analysisType,
      overall_score: a.overallScore,
      photoUrl: null,
    }));
    return [...created, ...seeded];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postedAnalysisIds } = await supabase
    .from("community_posts")
    .select("analysis_id")
    .eq("user_id", user!.id);
  const postedIds = new Set((postedAnalysisIds ?? []).map((p) => p.analysis_id));

  const { data: analyses } = await supabase
    .from("analyses")
    .select("id, occasion_id, analysis_type, overall_score, photo_path, created_at")
    .eq("user_id", user!.id)
    .eq("validity_status", "valid")
    .order("created_at", { ascending: false });

  const eligible = (analyses ?? []).filter((a) => !postedIds.has(a.id));

  const photoUrls = await signedPhotoUrls(supabase, eligible.map((a) => a.photo_path), "thumb");

  return eligible.map((a) => ({
    id: a.id,
    occasion_id: a.occasion_id,
    analysis_type: a.analysis_type as AnalysisType,
    overall_score: a.overall_score ?? 0,
    photoUrl: photoUrls.get(a.photo_path) ?? null,
  }));
}

export default async function PublishPage() {
  const withPhotoUrls = await loadEligibleAnalyses();

  return (
    <div className="screen-body pad">
      <ScreenHead title="Publicar" backHref="/community" />
      <p className="mb-5 text-sm font-semibold text-muted">
        Elegí un análisis para compartir en la comunidad.
      </p>

      <div className="flex flex-col gap-3">
        {withPhotoUrls.map((a) => (
          <div key={a.id} className="card flex items-center gap-3 p-3">
            <div className="ph relative h-16 w-14 flex-none overflow-hidden rounded-xl">
              {a.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.photoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <AnalysisTypePill type={a.analysis_type} />
              <span className="text-sm font-bold">{occasionLabel(a.occasion_id as OccasionId)}</span>
            </div>
            <span className="text-lg font-extrabold">{a.overall_score}</span>
            <PublishButton analysisId={a.id} />
          </div>
        ))}
        {withPhotoUrls.length === 0 && (
          <p className="py-10 text-center text-sm font-semibold text-muted">
            No tenés análisis nuevos para publicar.
          </p>
        )}
      </div>
    </div>
  );
}
