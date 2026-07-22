import Link from "next/link";
import { notFound } from "next/navigation";
import { getHydratedAnalysis } from "@/lib/analyses";
import { occasionFullLabel } from "@/lib/occasions";
import { scoreLevelLabel, scoreBandColorVar } from "@/lib/scoring/categories";
import { ScoreRing } from "@/components/analysis/ScoreRing";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { CategoryBreakdownSection } from "@/components/analysis/CategoryBreakdownSection";
import { PhotoLightbox } from "@/components/analysis/PhotoLightbox";
import { ShareButton } from "@/components/analysis/ShareButton";
import { ScoringInProgress } from "@/components/analysis/ScoringInProgress";
import { ScoreViewedTracker } from "@/components/analysis/ScoreViewedTracker";
import { PublishButton } from "@/components/community/PublishButton";
import { getPostForAnalysis } from "@/lib/community/posts";
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
      <div className="flex-1 overflow-y-auto pb-[176px]">
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
        <div
          className="card flex flex-col items-center p-[22px]"
          style={{ boxShadow: "0 18px 40px -22px rgba(20,18,16,.3)" }}
        >
          <ScoreRing score={analysis.overallScore} />
          <span className="section-label mt-4">Outfit Score</span>
          <span className="font-serif mt-1.5 text-[22px]">{occasionAndStyle}</span>
          {/* La insignia sale del MISMO score que pinta el aro (SCORE_LEVELS, la
              fuente única de la escala). Antes era texto libre del modelo con la
              clase fija `badge--top`, que es verde: un 16 pintaba el aro de rojo
              y la insignia de verde, diciendo dos cosas opuestas sobre el mismo
              outfit. */}
          <span
            className="badge mt-3"
            style={{
              height: 28,
              color: scoreBandColorVar(analysis.overallScore),
              background: `color-mix(in srgb, ${scoreBandColorVar(analysis.overallScore)} 14%, transparent)`,
            }}
          >
            <MaterialIcon name="verified" size={15} />
            {scoreLevelLabel(analysis.overallScore)}
          </span>

          {/* Share externo (imagen para WhatsApp/IG) prominente: el iconito del
              header pasaba desapercibido (movía 1 de 77). Acá, justo debajo del
              score, es el momento de máximo orgullo para compartir. Además
              desbloquea el gate de colorimetría. */}
          <div className="mt-5 w-full">
            <ShareButton analysisId={id} variant="full" />
          </div>
        </div>

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
            <div className="mb-3 flex items-center gap-2">
              <MaterialIcon name="auto_awesome" size={20} className="text-coral" />
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

        <CategoryBreakdownSection categories={analysis.categories} />
      </div>
      </div>

      {/* CTA principal fijo sobre la barra de tabs: compartir/ver en la
          comunidad. El degradado hacia --paper evita el corte seco con el
          contenido que scrollea por detrás. */}
      <div
        className="absolute inset-x-0 px-[22px] pb-3 pt-6"
        style={{
          bottom: 86,
          zIndex: 54,
          background: "linear-gradient(to top, var(--paper) 62%, rgba(247,245,240,0))",
        }}
      >
        {communityPost ? (
          <Link
            href={`/community/post/${communityPost.postId}`}
            className="btn btn-primary"
          >
            <MaterialIcon name="groups" size={20} />
            Ver en la comunidad
          </Link>
        ) : (
          <PublishButton
            analysisId={id}
            label="Compartir en comunidad"
            icon="groups"
            buttonStyle={{}}
            goToPost
          />
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
