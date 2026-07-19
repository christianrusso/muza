import Link from "next/link";
import { occasionLabel } from "@/lib/occasions";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { ScoreRing } from "@/components/analysis/ScoreRing";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import type { HomeLatestAnalysis } from "@/lib/home";
import type { AnalysisType, OccasionId } from "@/types/domain";

export function LatestAnalysisCard({
  latest,
  analysisType,
}: {
  latest: HomeLatestAnalysis | null;
  analysisType: AnalysisType;
}) {
  if (!latest) {
    return (
      <div className="card p-4 text-center text-sm font-semibold text-muted">
        Todavía no hiciste ningún análisis. ¡Sacate una foto de tu outfit para empezar!
      </div>
    );
  }

  return (
    <div className="card p-4" style={{ boxShadow: "0 12px 30px -18px rgba(20,18,16,.25)" }}>
      <div className="mb-3.5 flex items-center justify-between">
        <AnalysisTypePill type={analysisType} />
        <span className="section-label">Último Outfit Score</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="ph relative flex h-[132px] w-[104px] flex-none items-end justify-center overflow-hidden rounded-2xl pb-2">
          {latest.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={latest.photoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="ph-cap">foto de outfit</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <ScoreRing score={latest.overall_score ?? 0} size={92} innerInset={8} valueFontSize={30} maxFontSize={8} />
          <div className="flex flex-col gap-px">
            <span className="font-serif text-xl leading-tight">{occasionLabel(latest.occasion_id as OccasionId)}</span>
            <span className="text-sm font-semibold text-muted">{latest.style_descriptors?.join(" · ")}</span>
          </div>
        </div>
      </div>
      <div className="my-3 h-px bg-line" />
      <Link href={`/analysis/${latest.id}/result`} className="flex items-center justify-between">
        <span className="text-sm font-bold text-coral">Ver análisis completo</span>
        <MaterialIcon name="chevron_right" size={20} className="text-coral" />
      </Link>
    </div>
  );
}
