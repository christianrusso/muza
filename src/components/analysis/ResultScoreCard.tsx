import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { AnimatedScoreRing } from "@/components/analysis/AnimatedScoreRing";
import { OutfitPalette } from "@/components/analysis/OutfitPalette";

export function ResultScoreCard({
  score,
  occasionAndStyle,
  qualitativeBadge,
  detectedColores,
}: {
  score: number;
  occasionAndStyle: string;
  qualitativeBadge: string | null;
  detectedColores: string[];
}) {
  return (
    <div className="card flex flex-col items-center p-[22px]" style={{ boxShadow: "0 18px 40px -22px rgba(20,18,16,.3)" }}>
      <AnimatedScoreRing score={score} />
      <span className="section-label mt-4">Outfit Score</span>
      <span className="font-serif mt-1.5 text-[22px]">{occasionAndStyle}</span>
      {qualitativeBadge && (
        <span className="badge badge--top mt-3" style={{ height: 28 }}>
          <MaterialIcon name="verified" size={15} />
          {qualitativeBadge}
        </span>
      )}
      {detectedColores.length > 0 && (
        <>
          <div className="my-[22px] h-px w-full bg-line" />
          <OutfitPalette colors={detectedColores} />
        </>
      )}
    </div>
  );
}
