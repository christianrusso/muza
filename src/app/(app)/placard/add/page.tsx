import Link from "next/link";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

const METHODS = [
  {
    href: "/placard/add/upload",
    icon: "add_a_photo",
    title: "Subir una prenda",
    desc: "Una foto = una prenda. La IA la clasifica sola.",
  },
  {
    href: "/placard/add/detect",
    icon: "accessibility_new",
    title: "Detectar desde una foto tuya",
    desc: "Sacate una foto de cuerpo entero y detectamos cada prenda.",
  },
];

export default function AddGarmentPage() {
  return (
    <div className="screen-body pad">
      <ScreenHead title="Agregar prenda" backHref="/placard" />
      <p className="-mt-4 mb-4 text-sm font-semibold text-muted">Elegí cómo querés cargar tu ropa</p>

      <div className="flex flex-col gap-4">
        {METHODS.map((m) => (
          <Link key={m.href} href={m.href} className="card flex items-center gap-4 p-4">
            <span
              className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-2xl"
              style={{ background: "var(--violet-soft)" }}
            >
              <MaterialIcon name={m.icon} size={28} className="text-[var(--violet)]" />
            </span>
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-[19px] font-extrabold leading-tight text-ink">{m.title}</span>
              <span className="text-sm font-semibold leading-snug text-muted">{m.desc}</span>
            </span>
            <MaterialIcon name="chevron_right" size={22} className="text-[var(--violet)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
