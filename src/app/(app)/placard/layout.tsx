import { redirect } from "next/navigation";
import { canAccessPlacard } from "@/lib/placard/access";

// El gate depende de la sesión y de PLACARD_TESTERS: tiene que correr en cada
// request. Sin esto, con la allowlist vacía en build, canAccessPlacard corta
// antes de leer cookies y Next prerenderiza las subpáginas dejando la decisión
// horneada.
export const dynamic = "force-dynamic";

// Gate de las subpáginas del Placard (item, add, look, looks). Sin esto, un
// usuario normal podría saltarse la pantalla de "Próximamente" entrando por URL
// directa. Los no-testers rebotan a /placard, que les muestra el "Próximamente".
export default async function PlacardSubtreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await canAccessPlacard())) redirect("/placard");
  return <>{children}</>;
}
