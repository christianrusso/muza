import { ScreenHead } from "@/components/navigation/TopBar";
import { OccasionGrid } from "@/components/analysis/OccasionGrid";

export default function NewAnalysisPage() {
  return (
    <div className="screen-body pad">
      <ScreenHead title="¿Para qué ocasión?" backHref="/home" />
      <p className="mb-5 text-sm font-semibold text-muted">
        Elegí una para un análisis más preciso
      </p>
      <OccasionGrid />
    </div>
  );
}
