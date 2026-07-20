"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { getGarment, gradientStyle, CATEGORY_LABEL } from "@/lib/placard/mock";

export default function GarmentDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const garment = getGarment(id);

  if (!garment) {
    return (
      <div className="screen-body pad">
        <p className="text-center text-sm font-semibold text-muted">No encontramos esa prenda.</p>
        <Link href="/placard" className="btn btn-outline mt-4">
          Volver al placard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Hero con el gradiente de la prenda + percha gigante translúcida. */}
      <div
        className="relative flex h-[46dvh] items-center justify-center"
        style={{ background: gradientStyle(garment.grad) }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Volver"
          className="absolute left-4 top-[52px] flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
        >
          <MaterialIcon name="chevron_left" size={24} />
        </button>
        <button
          type="button"
          onClick={() => router.push("/placard")}
          aria-label="Eliminar prenda"
          className="absolute right-4 top-[52px] flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm"
        >
          <MaterialIcon name="delete" size={22} />
        </button>
        <MaterialIcon name="checkroom" size={120} className="text-white/25" />
      </div>

      <div className="flex flex-1 flex-col gap-5 px-[22px] pt-6">
        <div className="flex flex-col gap-3">
          <span className="font-serif text-[32px] leading-none text-ink">{garment.name}</span>
          <div className="flex flex-wrap gap-2">
            <span
              className="rounded-full px-3 py-1.5 text-xs font-extrabold"
              style={{ background: "var(--violet-soft)", color: "var(--violet)" }}
            >
              {CATEGORY_LABEL[garment.category]}
            </span>
            <span
              className="rounded-full px-3 py-1.5 text-xs font-extrabold text-muted"
              style={{ background: "var(--line)" }}
            >
              {garment.type}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="section-label">Colores</span>
          <div className="flex gap-2.5">
            {garment.colors.map((c) => (
              <span
                key={c}
                className="h-14 w-14 rounded-2xl border border-line"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="list-card mt-1">
          {/* Editar todavía no tiene pantalla en los mockups: queda como acción
              mock para no dejar una ruta muerta. */}
          <button type="button" className="row w-full text-left">
            <MaterialIcon name="edit" />
            <span className="txt">Editar prenda</span>
            <MaterialIcon name="chevron_right" className="chev" />
          </button>
          <Link href="/placard/look/new" className="row">
            <MaterialIcon name="auto_awesome" className="text-[var(--violet)]" />
            <span className="txt">Usar en un look</span>
            <MaterialIcon name="chevron_right" className="chev" />
          </Link>
        </div>
      </div>
    </div>
  );
}
