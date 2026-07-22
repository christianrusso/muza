import { DesktopBrandPanel } from "@/components/brand/DesktopBrandPanel";

// La app es mobile-first: una columna tipo teléfono de ~430px. En mobile esa
// columna ocupa toda la pantalla. En desktop, en vez de dejarla flotando sola
// en un vacío enorme, montamos un split a la Curata: panel branded a la
// izquierda (solo lg+) y la columna de la app pegada a la derecha, a altura
// completa. Mantener la columna full-height respeta los h-dvh internos (la
// tabbar absoluta, etc.) sin tocar cada pantalla.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full bg-ink-deep">
      <DesktopBrandPanel />
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] shrink-0 bg-paper shadow-[0_0_60px_-10px_rgba(0,0,0,0.55)] lg:mx-0">
        {children}
      </div>
    </div>
  );
}
