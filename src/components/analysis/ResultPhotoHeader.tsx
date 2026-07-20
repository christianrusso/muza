import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { ShareButton } from "@/components/analysis/ShareButton";
import type { AnalysisType } from "@/types/domain";

// Foto como fondo ambiental (borrosa): antes se veía nítida y quedaba rara
// según el encuadre (ej. la cara en una foto "superior"). El blur + scale la
// vuelve una textura de color detrás del score. El scale evita que el blur
// deje bordes transparentes.
export function ResultPhotoHeader({
  photoUrl,
  analysisType,
  analysisId,
  children,
}: {
  photoUrl: string | undefined;
  analysisType: AnalysisType;
  analysisId: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="ph relative overflow-hidden" style={{ height: 266 }}>
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
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
        <AnalysisTypePill type={analysisType} style={{ height: 32, background: "rgba(247,245,240,.92)" }} />
        <ShareButton analysisId={analysisId} />
      </div>
      {children}
    </div>
  );
}
