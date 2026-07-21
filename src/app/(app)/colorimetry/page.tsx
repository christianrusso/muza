import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { hasColorimetry } from "@/lib/colorimetry/store";

// La colorimetría es una por usuario. Si ya la tiene, esta ruta manda al
// resultado ("ver colorimetría"); si no, muestra el estado vacío para generarla.
export default async function ColorimetryPage() {
  if (!isDemoMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && (await hasColorimetry(supabase, user.id))) {
      redirect("/colorimetry/result");
    }
  }

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
