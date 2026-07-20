import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { gradientStyle, type Garment } from "@/lib/placard/mock";

// Card de prenda: gradiente decorativo + percha arriba a la izquierda y el nombre
// abajo. Se reusa en la grilla del placard y (sin link) donde haga falta.
export function GarmentCard({ garment }: { garment: Garment }) {
  return (
    <Link
      href={`/placard/item/${garment.id}`}
      className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-2xl p-2.5"
      style={{ background: gradientStyle(garment.grad) }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/85">
        <MaterialIcon name="checkroom" size={18} className="text-ink" />
      </span>
      <span className="text-[13px] font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.35)]">
        {garment.name}
      </span>
    </Link>
  );
}
