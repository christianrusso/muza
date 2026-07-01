import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { historyCutoffDate } from "@/lib/plans/gating";
import { occasionLabel } from "@/lib/occasions";
import { relativeShortDate } from "@/lib/dates";
import { scoreBandColorVar } from "@/lib/scoring/categories";
import { isDemoMode, DEMO_ANALYSES } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
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

  return Promise.all(
    (analyses ?? []).map(async (a) => {
      const { data: signed } = await supabase.storage
        .from("outfit-photos")
        .createSignedUrl(a.photo_path, 3600);
      return {
        id: a.id,
        occasion_id: a.occasion_id,
        analysis_type: a.analysis_type as AnalysisType,
        overall_score: a.overall_score ?? 0,
        created_at: a.created_at,
        photoUrl: signed?.signedUrl ?? null,
      };
    }),
  );
}

const TYPE_FILTERS: { value: AnalysisType | "all"; label: string; dot?: string }[] = [
  { value: "all", label: "Todos" },
  { value: "completo", label: "Completo", dot: "var(--violet)" },
  { value: "superior", label: "Superior", dot: "var(--green)" },
  { value: "inferior", label: "Inferior", dot: "var(--amber-ink)" },
  { value: "individual", label: "Individual", dot: "var(--pink)" },
];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const activeType = (type ?? "all") as AnalysisType | "all";
  const withPhotoUrls = await loadHistoryData(activeType);

  return (
    <div className="flex min-h-screen flex-col pt-[60px]">
      <div className="flex items-center justify-between px-[22px] pb-3.5">
        <span className="font-serif italic" style={{ fontSize: 34 }}>
          Historial
        </span>
        <button type="button" className="btn-icon" style={{ width: 40, height: 40, borderRadius: 12 }}>
          <MaterialIcon name="search" size={21} />
        </button>
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
        <button type="button" className="chip">
          <MaterialIcon name="tune" size={15} />
          Ocasión
        </button>
      </div>

      <div className="grid flex-1 content-start grid-cols-2 gap-[13px] px-[22px]">
        {withPhotoUrls.map((a) => (
          <Link key={a.id} href={`/analysis/${a.id}/result`}>
            <div
              className="gcard ph"
              style={a.photoUrl ? { backgroundImage: `url(${a.photoUrl})`, backgroundSize: "cover" } : {}}
            >
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
        ))}
      </div>

      {withPhotoUrls.length === 0 && (
        <p className="px-[22px] py-10 text-center text-sm font-semibold text-muted">
          No hay análisis para mostrar con este filtro.
        </p>
      )}
    </div>
  );
}
