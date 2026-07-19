import { notFound } from "next/navigation";
import { getHydratedAnalysis } from "@/lib/analyses";
import { occasionFullLabel } from "@/lib/occasions";
import { ResultPhotoHeader } from "@/components/analysis/ResultPhotoHeader";
import { ResultScoreCard } from "@/components/analysis/ResultScoreCard";
import { ResultFeedbackSection } from "@/components/analysis/ResultFeedbackSection";
import { CategoryBreakdownList } from "@/components/analysis/CategoryBreakdownList";
import { ScoringInProgress } from "@/components/analysis/ScoringInProgress";
import { TabScreenShell } from "@/components/navigation/TabScreenShell";

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
    <TabScreenShell>
      <ResultPhotoHeader photoUrl={analysis.photoUrl} analysisType={analysis.analysisType} />

      <div className="relative px-[22px]" style={{ marginTop: -70 }}>
        <ResultScoreCard
          score={analysis.overallScore}
          occasionAndStyle={occasionAndStyle}
          qualitativeBadge={analysis.qualitativeBadge}
          detectedColores={analysis.detectedColores}
        />

        <span className="section-label mb-3.5 mt-[26px] block px-1">Desglose por categoría</span>
        <CategoryBreakdownList categories={analysis.categories} />

        <ResultFeedbackSection
          className="mt-[26px]"
          title="Fortalezas"
          headerIcon="check_circle"
          itemIcon="check"
          iconClassName="text-[var(--green)]"
          items={fortalezas}
        />
        <ResultFeedbackSection
          title="Aspectos a mejorar"
          headerIcon="tips_and_updates"
          itemIcon="arrow_forward"
          iconClassName="text-[var(--amber-ink)]"
          items={aspectos}
        />
        <ResultFeedbackSection title="Recomendaciones" variant="rec" items={recomendaciones} />
      </div>
    </TabScreenShell>
  );
}
