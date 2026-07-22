import { redirect } from "next/navigation";
import { ScreenHead } from "@/components/navigation/TopBar";
import { ColorimetryPhotoPicker } from "@/components/colorimetry/ColorimetryPhotoPicker";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { hasColorimetry } from "@/lib/colorimetry/store";
import { getColorimetryEligibility } from "@/lib/colorimetry/eligibility";

export const dynamic = "force-dynamic";

export default async function NewColorimetryPage() {
  // Guard por URL directa: el que no cumple los requisitos de comunidad no puede
  // saltarse el muro entrando a /new a mano. Demo y quien ya tiene colorimetría
  // (que no debería re-generar) pasan por el flujo normal.
  if (!isDemoMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && !(await hasColorimetry(supabase, user.id))) {
      const { eligible } = await getColorimetryEligibility(supabase, user.id);
      if (!eligible) redirect("/colorimetry");
    }
  }

  return (
    <div className="screen-body pad">
      <ScreenHead title="Subí tu foto" backHref="/colorimetry" />
      <ColorimetryPhotoPicker />
    </div>
  );
}
