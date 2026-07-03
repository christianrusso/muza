import Link from "next/link";
import { notFound } from "next/navigation";
import { getHydratedAnalysis } from "@/lib/analyses";
import { occasionFullLabel } from "@/lib/occasions";
import { ScoreRing } from "@/components/analysis/ScoreRing";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { CategoryBreakdownList } from "@/components/analysis/CategoryBreakdownList";
import { SaveShareBar } from "@/components/analysis/SaveShareBar";
import { ScoringInProgress } from "@/components/analysis/ScoringInProgress";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getHydratedAnalysis(id);
  if (!analysis) notFound();

  // La validación ya pasó pero la IA todavía no puntuó → mostramos la foto + un
  // skeleton y disparamos el scoring; al terminar refresca y cae al render real.
  if (analysis.overallScore === null) {
    return (
      <ScoringInProgress analysisId={id} occasionId={analysis.occasionId} photoUrl={analysis.photoUrl} />
    );
  }

  const fortalezas = analysis.feedback.filter((f) => f.kind === "fortaleza");
  const aspectos = analysis.feedback.filter((f) => f.kind === "aspecto_mejorar");
  const recomendaciones = analysis.feedback.filter((f) => f.kind === "recomendacion");

  const occasionAndStyle = [occasionFullLabel(analysis.occasionId, analysis.occasionVariant), ...analysis.styleDescriptors]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-[130px]">
      <div className="ph relative overflow-hidden" style={{ height: 266 }}>
        {analysis.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={analysis.photoUrl}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,18,16,.28), rgba(20,18,16,0) 30%, rgba(247,245,240,0) 70%, var(--paper))",
          }}
        />
        <div className="absolute left-5 right-5 top-[58px] flex items-center justify-between">
          <Link
            href="/home"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
            style={{ background: "rgba(247,245,240,.9)" }}
          >
            <MaterialIcon name="chevron_left" size={22} />
          </Link>
          <AnalysisTypePill type={analysis.analysisType} style={{ height: 32, background: "rgba(247,245,240,.92)" }} />
          <button
            type="button"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full"
            style={{ background: "rgba(247,245,240,.9)" }}
          >
            <MaterialIcon name="ios_share" size={20} />
          </button>
        </div>
      </div>

      <div className="relative px-[22px]" style={{ marginTop: -70 }}>
        <div
          className="card flex flex-col items-center p-[22px]"
          style={{ boxShadow: "0 18px 40px -22px rgba(20,18,16,.3)" }}
        >
          <ScoreRing score={analysis.overallScore} />
          <span className="section-label mt-4">Outfit Score</span>
          <span className="font-serif mt-1.5 text-[22px]">{occasionAndStyle}</span>
          {analysis.qualitativeBadge && (
            <span className="badge badge--top mt-3" style={{ height: 28 }}>
              <MaterialIcon name="verified" size={15} />
              {analysis.qualitativeBadge}
            </span>
          )}
        </div>

        <span className="section-label mb-3.5 mt-[26px] block px-1">Desglose por categoría</span>
        <CategoryBreakdownList categories={analysis.categories} />

        {fortalezas.length > 0 && (
          <div className="mt-[26px]">
            <div className="mb-3 flex items-center gap-2">
              <MaterialIcon name="check_circle" size={20} className="text-[var(--green)]" />
              <span className="text-[15px] font-extrabold">Fortalezas</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {fortalezas.map((f) => (
                <div key={f.text} className="pt">
                  <MaterialIcon name="check" className="text-[var(--green)]" />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {aspectos.length > 0 && (
          <div className="mt-[22px]">
            <div className="mb-3 flex items-center gap-2">
              <MaterialIcon name="tips_and_updates" size={20} className="text-[var(--amber-ink)]" />
              <span className="text-[15px] font-extrabold">Aspectos a mejorar</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {aspectos.map((f) => (
                <div key={f.text} className="pt">
                  <MaterialIcon name="arrow_forward" className="text-[var(--amber-ink)]" />
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recomendaciones.length > 0 && (
          <div className="mt-[22px]">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-[15px] font-extrabold">Recomendaciones</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {recomendaciones.map((f) => (
                <div key={f.text} className="rec">
                  <span className="rt block">{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

        <SaveShareBar />
      </div>
      <BottomTabBar />
    </div>
  );
}
