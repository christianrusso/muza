import { canAccessPlacard } from "@/lib/placard/access";
import { PlacardGrid } from "@/components/placard/PlacardGrid";
import { PlacardComingSoon } from "@/components/placard/PlacardComingSoon";

// El gate (sesión + PLACARD_TESTERS) debe evaluarse por request, nunca hornearse
// en build. Ver lib/placard/access.ts.
export const dynamic = "force-dynamic";

// Mientras el feature esté mockeado: los testers de la allowlist ven la grilla
// real; el resto, "Próximamente". Ver lib/placard/access.ts.
export default async function PlacardPage() {
  const canAccess = await canAccessPlacard();
  return canAccess ? <PlacardGrid /> : <PlacardComingSoon />;
}
