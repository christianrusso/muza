import { Logo } from "@/components/brand/Logo";

// Panel branded que sólo aparece en desktop (lg+), al costado de la columna
// tipo teléfono. En mobile no se renderiza nada de esto (la columna ocupa toda
// la pantalla). Lo comparten el layout de la app y el de auth para que la
// experiencia en PC sea un split coherente estilo landing, en vez de una
// columnita flotando en el vacío.
const FEATURES = [
  {
    title: "Puntuá cada look",
    body: "Sacá una foto y recibí un score con IA para mejorar con el tiempo.",
  },
  {
    title: "Tu colorimetría personal",
    body: "Descubrí tu paleta y qué colores te favorecen de verdad.",
  },
  {
    title: "Comunidad",
    body: "Compartí tus looks y encontrá ideas para tu próximo outfit.",
  },
];

export function DesktopBrandPanel() {
  return (
    <aside
      className="relative hidden flex-1 flex-col justify-between overflow-hidden px-14 py-12 lg:flex"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      <div className="flex items-center gap-3">
        <Logo size={40} />
        <span className="font-serif text-2xl italic text-white">LookLab</span>
      </div>

      <div className="max-w-md">
        <h1 className="font-serif text-5xl italic leading-[1.05] text-white">
          Tu outfit,
          <br />
          evaluado.
        </h1>
        <ul className="mt-9 space-y-6">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
              <div>
                <p className="font-semibold text-white">{f.title}</p>
                <p className="mt-0.5 text-[15px] leading-snug text-white/55">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm font-medium text-white/40">
        Pensada para el celular — abrila desde tu teléfono para la mejor experiencia.
      </p>
    </aside>
  );
}
