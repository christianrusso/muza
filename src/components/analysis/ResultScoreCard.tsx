import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { AnimatedScoreRing } from "@/components/analysis/AnimatedScoreRing";
import { OutfitPalette } from "@/components/analysis/OutfitPalette";
import { scoreLevelLabel, scoreBandColorVar } from "@/lib/scoring/categories";

export function ResultScoreCard({
  score,
  occasionAndStyle,
  detectedColores,
}: {
  score: number;
  occasionAndStyle: string;
  detectedColores: string[];
}) {
  return (
    <div className="card flex flex-col items-center p-[22px]" style={{ boxShadow: "0 18px 40px -22px rgba(20,18,16,.3)" }}>
      <AnimatedScoreRing score={score} />
      <span className="section-label mt-4">Outfit Score</span>
      <span className="font-serif mt-1.5 text-[22px]">{occasionAndStyle}</span>
      {/* La insignia sale del MISMO score que pinta el aro (SCORE_LEVELS, la
          fuente única de la escala). Antes era texto libre del modelo
          (qualitativeBadge) con la clase fija `badge--top` (verde): un 16
          pintaba el aro de rojo y la insignia de verde, diciendo dos cosas
          opuestas sobre el mismo outfit. */}
      <span
        className="badge mt-3"
        style={{
          height: 28,
          color: scoreBandColorVar(score),
          background: `color-mix(in srgb, ${scoreBandColorVar(score)} 14%, transparent)`,
        }}
      >
        <MaterialIcon name="verified" size={15} />
        {scoreLevelLabel(score)}
      </span>
      {detectedColores.length > 0 && (
        <>
          <div className="my-[22px] h-px w-full bg-line" />
          <OutfitPalette colors={detectedColores} />
        </>
      )}
    </div>
  );
}
