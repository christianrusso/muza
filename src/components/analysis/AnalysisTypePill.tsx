import type { AnalysisType } from "@/types/domain";

const LABELS: Record<AnalysisType, string> = {
  completo: "Completo",
  superior: "Superior",
  inferior: "Inferior",
  individual: "Individual",
};

const BADGE_CLASS: Record<AnalysisType, string> = {
  completo: "badge--full",
  superior: "badge--top",
  inferior: "badge--bottom",
  individual: "badge--single",
};

export function AnalysisTypePill({
  type,
  className,
  style,
}: {
  type: AnalysisType;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`badge ${BADGE_CLASS[type]} ${className ?? ""}`} style={style}>
      <span className="dot" />
      <span>{LABELS[type]}</span>
    </span>
  );
}
