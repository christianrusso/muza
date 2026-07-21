import Link from "next/link";
import { canAccessColorimetry } from "@/lib/colorimetry/access";
import { BackButton } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// El gate depende de la sesión y de COLORIMETRY_TESTERS: corre en cada request.
export const dynamic = "force-dynamic";

// Bloquea TODO el subárbol de colorimetría mientras está en desarrollo. Los no
// testers ven "Próximamente" (también entrando por URL directa), no el flujo.
export default async function ColorimetryLayout({ children }: { children: React.ReactNode }) {
  if (await canAccessColorimetry()) return <>{children}</>;

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
          Colorimetría
        </h1>
        <p className="mt-3 max-w-[300px] text-[15px] font-semibold leading-relaxed text-muted">
          Estamos afinando esta función. Muy pronto vas a poder descubrir tu paleta ideal.
        </p>
        <span
          className="mt-6 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-wide"
          style={{ background: "var(--violet-soft)", color: "var(--violet)" }}
        >
          <MaterialIcon name="lock" size={14} />
          Próximamente
        </span>
      </div>
      <Link href="/home" className="btn btn-outline">
        Volver al inicio
      </Link>
    </div>
  );
}
