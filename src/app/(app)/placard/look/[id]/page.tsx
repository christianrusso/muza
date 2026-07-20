"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";
import { getLook, getGarment, gradientStyle } from "@/lib/placard/mock";

export default function LookResultPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const look = getLook(id);

  if (!look) {
    return (
      <div className="screen-body pad">
        <p className="text-center text-sm font-semibold text-muted">No encontramos ese look.</p>
        <Link href="/placard/looks" className="btn btn-outline mt-4">
          Ver mis looks
        </Link>
      </div>
    );
  }

  const garments = look.garmentIds.map(getGarment).filter(Boolean);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] pb-[220px] pt-[60px]">
        <ScreenHead title="Tu look" backHref="/placard" />

        {/* Imagen del look "generada por IA" (placeholder con gradiente). */}
        <div
          className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-3xl"
          style={{ background: gradientStyle(look.grad) }}
        >
          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[var(--violet)]">
            <MaterialIcon name="auto_awesome" size={14} />
            Generado por IA
          </span>
          <MaterialIcon name="checkroom" size={120} className="text-white/25" />
          <span className="absolute bottom-4 left-4 flex items-center gap-1.5 text-xs font-semibold text-white/80">
            <MaterialIcon name="image" size={16} />
            Foto del look generada por IA
          </span>
        </div>

        <span className="mt-5 block font-serif text-[32px] leading-none text-ink">{look.title}</span>
        <span className="mt-1.5 block text-sm font-semibold text-muted">
          {look.descriptors.join(" · ")}
        </span>

        <span className="section-label mt-5 block">Armado con tu ropa</span>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {garments.map((g) => (
            <Link key={g!.id} href={`/placard/item/${g!.id}`} className="flex flex-col gap-1.5">
              <span
                className="aspect-square rounded-2xl"
                style={{ background: gradientStyle(g!.grad) }}
              />
              <span className="text-center text-[11px] font-semibold leading-tight text-muted">
                {g!.name}
              </span>
            </Link>
          ))}
        </div>

        <div
          className="mt-5 flex flex-col gap-3 rounded-2xl p-4"
          style={{ background: "var(--violet-soft)" }}
        >
          <span className="flex items-center gap-2 text-[15px] font-extrabold text-[var(--violet)]">
            <MaterialIcon name="lightbulb" size={20} />
            Por qué funciona
          </span>
          <p className="text-sm font-semibold leading-relaxed text-ink">{look.why}</p>
          <div className="flex items-center gap-3">
            <div
              className="ring"
              style={
                {
                  width: 56,
                  height: 56,
                  "--p": look.coherence / 100,
                  "--c": "var(--violet)",
                } as React.CSSProperties
              }
            >
              <div className="inner" style={{ inset: 6 }}>
                <span className="val" style={{ fontSize: 18 }}>
                  {look.coherence}
                </span>
              </div>
            </div>
            <span className="text-sm font-bold text-[var(--violet)]">
              Coherencia del look para la ocasión
            </span>
          </div>
        </div>
      </div>

      <div className="bottom-cta">
        <Button className="btn-violet" onClick={() => router.push("/placard/looks")}>
          <MaterialIcon name="bookmark_border" size={20} />
          Guardar look
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/placard/look/generating")}
          >
            <MaterialIcon name="refresh" size={20} />
            Regenerar
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => router.push("/placard/looks")}>
            <MaterialIcon name="ios_share" size={20} />
            Publicar
          </Button>
        </div>
      </div>
    </div>
  );
}
