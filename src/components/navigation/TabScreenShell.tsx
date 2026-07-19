import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { PageTransition } from "@/components/navigation/PageTransition";

/**
 * Estructura común a toda pantalla con tab bar: contenedor de altura fija,
 * área con scroll propio, y la tab bar fija abajo. La usan tanto las 4 tabs
 * (`(tabs)/layout.tsx`) como la pantalla de resultado (que no vive dentro del
 * route group `(tabs)` pero visualmente necesita lo mismo) — antes cada una
 * reconstruía este mismo markup por separado.
 *
 * El contenido (no la tab bar) se remonta en cada cambio de ruta para que la
 * transición de entrada se sienta al navegar, sin que la tab bar parpadee.
 */
export function TabScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-[100px]">
        <PageTransition>{children}</PageTransition>
      </div>
      <BottomTabBar />
    </div>
  );
}
