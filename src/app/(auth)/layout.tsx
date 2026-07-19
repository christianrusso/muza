export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Fondo oscuro a pantalla completa detrás de la columna tipo teléfono: en
  // mobile la columna la tapa por completo; en desktop encuadra la app como un
  // dispositivo en vez de dejar los márgenes en paper (blanco) que se veía mal.
  return (
    <div className="min-h-dvh w-full bg-ink-deep">
      <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-paper md:shadow-[0_0_60px_-10px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </div>
  );
}
