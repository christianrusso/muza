import { notFound } from "next/navigation";
import { getHydratedAnalysis } from "@/lib/analyses";
import { occasionFullLabel } from "@/lib/occasions";
import { ResultPhotoHeader } from "@/components/analysis/ResultPhotoHeader";
import { ResultScoreCard } from "@/components/analysis/ResultScoreCard";
import { ResultFeedbackSection } from "@/components/analysis/ResultFeedbackSection";
import { CategoryBreakdownList } from "@/components/analysis/CategoryBreakdownList";
import { PhotoLightbox } from "@/components/analysis/PhotoLightbox";
import { ShareButton } from "@/components/analysis/ShareButton";
import { ScoringInProgress } from "@/components/analysis/ScoringInProgress";
import { ScoreViewedTracker } from "@/components/analysis/ScoreViewedTracker";
import { PublishButton } from "@/components/community/PublishButton";
import { getPostForAnalysis } from "@/lib/community/posts";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
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

  // ¿Este análisis ya está publicado en la comunidad? Decide entre ofrecer
  // "Publicar" o el acceso a sus comentarios.
  const communityPost = await getPostForAnalysis(id);

  const fortalezas = analysis.feedback.filter((f) => f.kind === "fortaleza");
  const aspectos = analysis.feedback.filter((f) => f.kind === "aspecto_mejorar");
  const recomendaciones = analysis.feedback.filter((f) => f.kind === "recomendacion");

  const occasionAndStyle = [occasionFullLabel(analysis.occasionId, analysis.occasionVariant), ...analysis.styleDescriptors]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <ScoreViewedTracker
        analysisId={id}
        occasionId={analysis.occasionId}
        analysisType={analysis.analysisType}
        overallScore={analysis.overallScore}
      />
      <div className="flex-1 overflow-y-auto pb-[100px]">
      <div className="ph relative overflow-hidden" style={{ height: 266 }}>
        {analysis.photoUrl && (
          // Foto como fondo ambiental (borrosa): antes se veía nítida y quedaba
          // rara según el encuadre (ej. la cara en una foto "superior"). El blur
          // + scale la vuelve una textura de color detrás del score. El scale
          // evita que el blur deje bordes transparentes.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={analysis.photoUrl}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "blur(20px)", transform: "scale(1.2)" }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(20,18,16,.42), rgba(20,18,16,.1) 34%, rgba(247,245,240,0) 68%, var(--paper))",
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
          <ShareButton analysisId={id} />
        </div>

        {analysis.photoUrl && (
          <div className="absolute left-1/2 top-[102px] -translate-x-1/2">
            <PhotoLightbox url={analysis.photoUrl} />
          </div>
        )}
      </div>

      <div className="relative px-[22px]" style={{ marginTop: -70 }}>
        <ResultScoreCard
          score={analysis.overallScore}
          occasionAndStyle={occasionAndStyle}
          qualitativeBadge={analysis.qualitativeBadge}
          detectedColores={analysis.detectedColores}
        />

        {communityPost ? (
          <Link
            href={`/community/post/${communityPost.postId}`}
            className="card mt-[18px] flex items-center gap-3 p-4"
          >
            <MaterialIcon name="forum" size={22} className="text-coral" />
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-extrabold">Publicado en la comunidad</span>
              <span className="text-xs font-semibold text-muted">
                {communityPost.commentCount === 0
                  ? "Todavía sin comentarios — mirá los votos"
                  : `${communityPost.commentCount} ${communityPost.commentCount === 1 ? "comentario" : "comentarios"}`}
              </span>
            </div>
            <MaterialIcon name="chevron_right" size={22} className="text-muted" />
          </Link>
        ) : (
          <div className="card mt-[18px] flex items-center gap-3 p-4">
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-extrabold">Compartilo con la comunidad</span>
              <span className="text-xs font-semibold text-muted">Recibí votos y comentarios de otros</span>
            </div>
            <PublishButton
              analysisId={id}
              label="Publicar"
              buttonStyle={{ height: 40, padding: "0 20px", fontSize: 13 }}
              goToPost
            />
          </div>
        )}

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
      </div>
    </TabScreenShell>
  );
}
