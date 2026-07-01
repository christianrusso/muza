import { scoreBandColorVar } from "@/lib/scoring/categories";

export function ScoreRing({
  score,
  size = 132,
  innerInset = 11,
  valueFontSize = 46,
  maxFontSize = 10,
}: {
  score: number;
  size?: number;
  innerInset?: number;
  valueFontSize?: number;
  maxFontSize?: number;
}) {
  const progress = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div
      className="ring"
      style={
        {
          width: size,
          height: size,
          "--p": progress,
          "--c": scoreBandColorVar(score),
        } as React.CSSProperties
      }
    >
      <div className="inner" style={{ inset: innerInset }}>
        <span className="val" style={{ fontSize: valueFontSize }}>
          {score}
        </span>
        <span className="max" style={{ fontSize: maxFontSize }}>
          / 100
        </span>
      </div>
    </div>
  );
}
