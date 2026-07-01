export function Logo({ size = 58, onDark = true }: { size?: number; onDark?: boolean }) {
  const ringSize = Math.round(size * 0.79);
  const holeSize = Math.round(size * 0.6);

  return (
    <div
      className="mark"
      style={{
        width: size,
        height: size,
        background: onDark ? "rgba(20,18,16,.4)" : "rgba(255,255,255,.5)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="mark"
        style={{
          width: ringSize,
          height: ringSize,
          background:
            "conic-gradient(from -55deg, var(--coral) 0turn .72turn, rgba(247,245,240,.45) .72turn 1turn)",
        }}
      >
        <div
          className="hole"
          style={{
            width: holeSize,
            height: holeSize,
            background: onDark ? "var(--ink-deep)" : "var(--paper)",
          }}
        >
          <span
            className="m"
            style={{ fontSize: holeSize * 0.55, color: onDark ? "var(--paper)" : "var(--ink-deep)" }}
          >
            M
          </span>
        </div>
      </div>
    </div>
  );
}
