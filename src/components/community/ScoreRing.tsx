// Anillo circular con el score de la IA en el centro ("82 / 100"). Protagonista
// del reveal en el modo "Votá".
export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--green)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-[38px] font-extrabold text-ink">{score}</span>
        <span className="text-[11px] font-semibold text-faint">/ 100</span>
      </div>
    </div>
  );
}
