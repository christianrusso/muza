import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/photos";
import { historyCutoffDate } from "@/lib/plans/gating";
import { occasionLabel } from "@/lib/occasions";
import { relativeShortDate } from "@/lib/dates";
import { scoreBandColorVar } from "@/lib/scoring/categories";
import { isDemoMode, DEMO_ANALYSES } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { getPostRefsForUser } from "@/lib/community/posts";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { PublishButton } from "@/components/community/PublishButton";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { GridSkeleton } from "@/components/loading/Skeletons";
import type { AnalysisType, OccasionId } from "@/types/domain";

interface HistoryItem {
  id: string;
  occasion_id: string;
  analysis_type: AnalysisType;
  overall_score: number;
  created_at: string;
  photoUrl: string | null;
}

async function loadHistoryData(activeType: AnalysisType | "all"): Promise<HistoryItem[]> {
  if (isDemoMode()) {
    const created = Array.from(getDemoStore().analyses.values())
      .filter((a) => a.validityStatus === "valid" && a.overallScore !== null)
      .map((a) => ({
        id: a.id,
        occasion_id: a.occasionId,
        analysis_type: a.analysisType ?? "completo",
        overall_score: a.overallScore!,
        created_at: a.createdAt,
        photoUrl: a.photoDataUrl,
      }));
    const seeded = DEMO_ANALYSES.map((a) => ({
      id: a.id,
      occasion_id: a.occasionId,
      analysis_type: a.analysisType,
      overall_score: a.overallScore,
      created_at: a.createdAt,
      photoUrl: null,
    }));
    const all = [...created, ...seeded];
    return activeType === "all" ? all : all.filter((a) => a.analysis_type === activeType);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user!.id)
    .single();
  const cutoff = historyCutoffDate((profile?.plan_tier as "free" | "pro") ?? "free");

  let query = supabase
    .from("analyses")
    .select("id, occasion_id, analysis_type, overall_score, photo_path, created_at")
    .eq("user_id", user!.id)
    .eq("validity_status", "valid")
    .order("created_at", { ascending: false });

  if (activeType !== "all") query = query.eq("analysis_type", activeType);
  if (cutoff) query = query.gte("created_at", cutoff.toISOString());

  const { data: analyses } = await query;

  const photoUrls = await signedPhotoUrls(supabase, (analyses ?? []).map((a) => a.photo_path), "thumb");

  return (analyses ?? []).map((a) => ({
    id: a.id,
    occasion_id: a.occasion_id,
    analysis_type: a.analysis_type as AnalysisType,
    overall_score: a.overall_score ?? 0,
    created_at: a.created_at,
    photoUrl: photoUrls.get(a.photo_path) ?? null,
  }));
}

const TYPE_FILTERS: { value: AnalysisType | "all"; label: string; dot?: string }[] = [
  { value: "all", label: "Todos" },
  { value: "completo", label: "Completo", dot: "var(--violet)" },
  { value: "superior", label: "Superior", dot: "var(--green)" },
  { value: "inferior", label: "Inferior", dot: "var(--amber-ink)" },
];

async function HistoryGrid({ activeType }: { activeType: AnalysisType | "all" }) {
  const [withPhotoUrls, postRefs] = await Promise.all([loadHistoryData(activeType), getPostRefsForUser()]);

  if (withPhotoUrls.length === 0) {
    return (
      <p className="px-[22px] py-10 text-center text-sm font-semibold text-muted">
        No hay análisis para mostrar con este filtro.
      </p>
    );
  }

  return (
    <div className="grid flex-1 content-start grid-cols-2 gap-[13px] px-[22px]">
      {withPhotoUrls.map((a) => {
        const post = postRefs.get(a.id);
        return (
          <div key={a.id} className="flex flex-col">
            <Link href={`/analysis/${a.id}/result`}>
              <div className="gcard ph">
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
                <AnalysisTypePill type={a.analysis_type as AnalysisType} className="gbadge" />
                <span className="gscore" style={{ background: scoreBandColorVar(a.overall_score ?? 0) }}>
                  {a.overall_score}
                </span>
              </div>
              <div className="gmeta">
                <span>{occasionLabel(a.occasion_id as OccasionId)}</span>
                <span>{relativeShortDate(a.created_at)}</span>
              </div>
            </Link>
            {post ? (
              <Link
                href={`/community/post/${post.postId}`}
                className="mt-1.5 flex items-center justify-center gap-1.5 rounded-full border border-line py-1.5 text-[12px] font-bold text-muted"
              >
                <MaterialIcon name="forum" size={15} className="text-coral" />
                {post.commentCount > 0 ? `${post.commentCount} coment.` : "Ver en comunidad"}
              </Link>
            ) : (
              <PublishButton
                analysisId={a.id}
                label="Publicar"
                variant="outline"
                buttonStyle={{ width: "100%", height: 34, fontSize: 12, marginTop: 6 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType = (type ?? "all") as AnalysisType | "all";

  return (
    <div className="flex min-h-full flex-col pt-[60px]">
      <div className="flex items-center px-[22px] pb-3.5">
        <span className="font-serif italic" style={{ fontSize: 34 }}>
          Historial
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto px-[22px] pb-4">
        {TYPE_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/history" : `/history?type=${f.value}`}
            className={`chip ${activeType === f.value ? "active" : ""}`}
          >
            {f.dot && <span className="dot" style={{ background: f.dot }} />}
            {f.label}
          </Link>
        ))}
      </div>

      {/* Header y filtros pintan al instante; la grilla llega por streaming. */}
      <Suspense key={activeType} fallback={<GridSkeleton columns={2} />}>
        <HistoryGrid activeType={activeType} />
      </Suspense>
    </div>
  );
}
