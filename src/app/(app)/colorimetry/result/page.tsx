import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_COLORIMETRY } from "@/lib/colorimetry/demo";
import { BestColorsRow } from "@/components/colorimetry/BestColorsRow";
import { OutfitGroupTabs } from "@/components/colorimetry/OutfitGroupTabs";
import { ShareColorimetryButton } from "@/components/colorimetry/ShareColorimetryButton";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { LookImages } from "@/components/colorimetry/LookImages";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { getUserColorimetry } from "@/lib/colorimetry/store";
import type { Colorimetry } from "@/types/colorimetry";

export default async function ColorimetryResultPage() {
  let c: Colorimetry;
  // URLs firmadas de las imágenes ya generadas (null = falta; el cliente las pide
  // on-demand). Looks: paralelo a c.looks. Outfits: por id de grupo.
  let lookUrls: (string | null)[];
  let outfitUrls: Record<string, string | null> = {};

  if (isDemoMode()) {
    c = DEMO_COLORIMETRY;
    lookUrls = c.looks.map(() => null);
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const saved = user ? await getUserColorimetry(supabase, user.id) : null;
    // Sin colorimetría guardada: no hay nada que mostrar → al inicio del flujo.
    if (!saved) redirect("/colorimetry");
    c = saved;
    const sign = async (path?: string | null) => {
      if (!path) return null;
      const { data } = await supabase.storage.from("colorimetry-photos").createSignedUrl(path, 600);
      return data?.signedUrl ?? null;
    };
    lookUrls = await Promise.all(c.looks.map((_, i) => sign(c.lookImages?.[i])));
    outfitUrls = Object.fromEntries(
      await Promise.all(c.outfitGroups.map(async (g) => [g.id, await sign(c.outfitImages?.[g.id])] as const)),
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* pb con margen para el safe area (ya no hay barra de acciones fija). */}
      <div className="flex-1 overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div
          className="relative flex flex-col items-center justify-end pb-[52px]"
          style={{
            height: 300,
            background:
              "linear-gradient(to bottom, #9C7A69, #7A5B4C 58%, rgba(247,245,240,0) 100%)",
          }}
        >
          <div className="absolute left-5 right-5 top-[58px] flex items-center justify-between">
            <Link
              href="/colorimetry"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white/25 backdrop-blur-sm"
              aria-label="Volver"
            >
              <MaterialIcon name="chevron_left" size={22} className="text-white" />
            </Link>
            <ShareColorimetryButton season={c.season} />
          </div>

          <span className="section-label text-white/70">Tu temporada</span>
          <h1 className="font-serif mt-1 text-[38px] italic text-white">{c.season}</h1>

          <div className="mt-4 flex gap-2.5">
            {c.traits.map((trait) => (
              <span
                key={trait.label}
                className="flex h-[38px] items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-bold text-white backdrop-blur-sm"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: trait.dot }} />
                {trait.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative px-[22px]" style={{ marginTop: -34 }}>
          <div
            className="card flex items-stretch bg-white p-0"
            style={{ boxShadow: "0 18px 40px -22px rgba(20,18,16,.3)" }}
          >
            {[
              { value: c.subtone, label: "Subtono" },
              { value: c.contrast, label: "Contraste" },
              { value: c.depth, label: "Profundidad" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-1 flex-col items-center gap-1 py-[18px] ${
                  i > 0 ? "border-l border-[var(--line)]" : ""
                }`}
              >
                <span className="font-serif text-[22px]">{stat.value}</span>
                <span className="section-label">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="mb-3.5 mt-[30px] flex items-baseline justify-between">
            <span className="section-label">Tus mejores colores</span>
            <span className="text-xs font-semibold text-faint">Tocá para copiar el HEX</span>
          </div>
          <BestColorsRow colors={c.bestColors} />

          <span className="section-label mb-3.5 mt-[30px] block">Tu paleta completa</span>
          <div className="grid grid-cols-5 gap-x-2.5 gap-y-4">
            {c.palette.map((color) => (
              <div key={color.name} className="flex flex-col items-center gap-1.5">
                <span
                  className="aspect-square w-full rounded-full"
                  style={{ background: color.hex }}
                />
                <span className="text-[11px] font-semibold text-muted">{color.name}</span>
              </div>
            ))}
          </div>

          <span className="section-label mb-3.5 mt-[30px] block">Ropa recomendada</span>
          <OutfitGroupTabs groups={c.outfitGroups} initialImages={outfitUrls} />

          <span className="section-label mb-3.5 mt-[30px] block">Accesorios recomendados</span>
          <div className="grid grid-cols-2 gap-3">
            {c.accessories.map((a) => (
              <div key={a.title} className="card flex flex-col gap-1.5 bg-white p-4">
                <MaterialIcon name={a.icon} size={22} className="text-[var(--violet)]" />
                <span className="mt-1 text-[15px] font-extrabold leading-tight">{a.title}</span>
                <span className="text-[13px] font-semibold leading-snug text-muted">{a.advice}</span>
              </div>
            ))}
          </div>

          <span className="section-label mb-3.5 mt-[30px] block">Looks que te quedan increíbles</span>
          <LookImages looks={c.looks} initialUrls={lookUrls} />

          <div className="mt-[30px] flex items-center gap-2">
            <MaterialIcon name="block" size={20} className="text-[var(--red)]" />
            <span className="text-[15px] font-extrabold">Qué evitar</span>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {c.avoid.map((text) => (
              <div key={text} className="pt">
                <MaterialIcon name="close" className="text-[var(--red)]" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-[26px] flex items-center gap-2">
            <MaterialIcon name="lightbulb" size={20} className="text-[var(--violet)]" />
            <span className="text-[15px] font-extrabold">Cómo combinar</span>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {c.combine.map((text) => (
              <div key={text} className="pt">
                <MaterialIcon name="arrow_forward" className="text-[var(--violet)]" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div
            className="mt-[26px] flex items-center gap-2.5 rounded-[18px] px-4 py-3.5 text-[14px] font-bold leading-snug text-[var(--violet)]"
            style={{ background: "var(--violet-soft)" }}
          >
            <MaterialIcon name="check_circle" size={20} className="flex-none" />
            <span>Tu colorimetría quedó guardada en tu perfil. Podés verla cuando quieras.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
