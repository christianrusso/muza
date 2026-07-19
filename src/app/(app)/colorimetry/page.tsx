import Link from "next/link";
import { BackButton } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Estado vacío de colorimetría: todavía no hay ninguna generada. Cuando exista
// persistencia, esta misma ruta muestra la última colorimetría y este bloque
// queda solo para quien no tiene ninguna.
export default function ColorimetryPage() {
  return (
    <div className="screen-body pad">
      <div className="screen-head">
        <BackButton href="/home" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          className="flex h-[92px] w-[92px] items-center justify-center rounded-[26px]"
          style={{ background: "var(--violet-soft)" }}
        >
          <MaterialIcon name="palette" size={44} className="text-[var(--violet)]" />
        </span>
        <h1 className="mt-6 font-serif" style={{ fontSize: 32 }}>
          Nueva Colorimetría
        </h1>
        <p className="mt-3 max-w-[300px] text-[15px] font-semibold leading-relaxed text-muted">
          Subí una foto actual y la IA analizará tu temporada, paleta y
          recomendaciones personalizadas.
        </p>
      </div>

      <Link href="/colorimetry/new" className="btn btn-violet">
        <MaterialIcon name="auto_awesome" size={20} />
        Generar Nueva Colorimetría
      </Link>
    </div>
  );
}
