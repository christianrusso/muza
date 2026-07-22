import { DesktopBrandPanel } from "@/components/brand/DesktopBrandPanel";

// Mismo split que el layout de la app: en mobile la columna tipo teléfono ocupa
// toda la pantalla; en desktop sumamos el panel branded a la izquierda para que
// welcome/login/register no queden como una columnita flotando en negro.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full bg-ink-deep">
      <DesktopBrandPanel />
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] shrink-0 bg-paper shadow-[0_0_60px_-10px_rgba(0,0,0,0.55)] lg:mx-0">
        {children}
      </div>
    </div>
  );
}
