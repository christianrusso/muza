import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { greetingDate } from "@/lib/dates";
import { occasionLabel } from "@/lib/occasions";
import { isDemoMode, DEMO_USER, DEMO_ANALYSES } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { ScoreRing } from "@/components/analysis/ScoreRing";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import type { AnalysisType, OccasionId } from "@/types/domain";

const HOME_HEADLINE_TYPE: AnalysisType = "completo";

async function loadHomeData() {
  if (isDemoMode()) {
    const created = Array.from(getDemoStore().analyses.values()).filter(
      (a) => a.validityStatus === "valid" && a.overallScore !== null,
    );
    const allScores = [
      ...DEMO_ANALYSES.map((a) => a.overallScore),
      ...created.map((a) => a.overallScore!),
    ];
    const latest = DEMO_ANALYSES.filter((a) => a.analysisType === HOME_HEADLINE_TYPE).map((a) => ({
      id: a.id,
      occasion_id: a.occasionId,
      overall_score: a.overallScore,
      style_descriptors: a.styleDescriptors,
      photoUrl: null as string | null,
    }))[0];

    return {
      firstName: DEMO_USER.full_name.split(" ")[0],
      avatarUrl: null as string | null,
      latest,
      totalCount: allScores.length,
      average: allScores.length
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : null,
    };
  }

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
        photoUrl: (
          await supabase.storage.from("outfit-photos").createSignedUrl(latestCompleto.photo_path, 3600)
        ).data?.signedUrl ?? null,
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

export default async function HomePage() {
  const { firstName, avatarUrl, latest, totalCount, average } = await loadHomeData();

  return (
    <div className="screen-body pad-tab" style={{ gap: 18 }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="section-label">{greetingDate()}</span>
          <span className="text-[26px] font-extrabold text-ink">
            Hola, <span className="font-serif italic text-[32px] font-normal">{firstName}</span>
          </span>
        </div>
        <div
          className="ph h-[46px] w-[46px] rounded-full border-2 border-white"
          style={{
            boxShadow: "0 2px 8px rgba(0,0,0,.08)",
            ...(avatarUrl
              ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : {}),
          }}
        />
      </div>

      {latest ? (
        <div className="card p-4" style={{ boxShadow: "0 12px 30px -18px rgba(20,18,16,.25)" }}>
          <div className="mb-3.5 flex items-center justify-between">
            <AnalysisTypePill type={HOME_HEADLINE_TYPE} />
            <span className="section-label">Último Outfit Score</span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="ph flex h-[132px] w-[104px] flex-none items-end justify-center rounded-2xl pb-2"
              style={latest.photoUrl ? { backgroundImage: `url(${latest.photoUrl})`, backgroundSize: "cover" } : {}}
            >
              {!latest.photoUrl && <span className="ph-cap">foto de outfit</span>}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <ScoreRing score={latest.overall_score ?? 0} size={92} innerInset={8} valueFontSize={30} maxFontSize={8} />
              <div className="flex flex-col gap-px">
                <span className="font-serif text-xl leading-tight">
                  {occasionLabel(latest.occasion_id as OccasionId)}
                </span>
                <span className="text-sm font-semibold text-muted">
                  {latest.style_descriptors?.join(" · ")}
                </span>
              </div>
            </div>
          </div>
          <div className="my-3 h-px bg-line" />
          <Link href={`/analysis/${latest.id}/result`} className="flex items-center justify-between">
            <span className="text-sm font-bold text-coral">Ver análisis completo</span>
            <MaterialIcon name="chevron_right" size={20} className="text-coral" />
          </Link>
        </div>
      ) : (
        <div className="card p-4 text-center text-sm font-semibold text-muted">
          Todavía no hiciste ningún análisis. ¡Sacate una foto de tu outfit para empezar!
        </div>
      )}

      <div className="flex gap-3">
        <div className="card flex-1 p-3.5">
          <span className="section-label">Promedio histórico</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[30px] font-extrabold">{average ?? "—"}</span>
          </div>
        </div>
        <div className="card flex-1 p-3.5">
          <span className="section-label">Análisis</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[30px] font-extrabold">{totalCount}</span>
            <span className="text-[11px] font-bold text-faint">en total</span>
          </div>
        </div>
      </div>

      <Link
        href="/analysis/new"
        className="flex items-center gap-3.5 rounded-[20px] bg-coral px-[18px] py-4"
        style={{ boxShadow: "0 14px 26px -12px rgba(236,90,46,.6)" }}
      >
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-white/[.18]">
          <MaterialIcon name="photo_camera" size={26} className="text-white" />
        </span>
        <span className="flex flex-1 flex-col items-start gap-0.5">
          <span className="text-[17px] font-extrabold text-white">Nuevo análisis</span>
          <span className="text-xs font-semibold text-white/85">Sacá una foto de tu outfit</span>
        </span>
        <MaterialIcon name="arrow_forward" size={24} className="text-white" />
      </Link>
    </div>
  );
}
