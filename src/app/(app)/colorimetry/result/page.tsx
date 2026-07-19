import Link from "next/link";
import { DEMO_COLORIMETRY } from "@/lib/colorimetry/demo";
import { BestColorsRow } from "@/components/colorimetry/BestColorsRow";
import { OutfitGroupTabs } from "@/components/colorimetry/OutfitGroupTabs";
import { ShareColorimetryButton } from "@/components/colorimetry/ShareColorimetryButton";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export default function ColorimetryResultPage() {
  const c = DEMO_COLORIMETRY;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* pb generoso: la barra de acciones es fija y taparía el final del scroll. */}
      <div className="flex-1 overflow-y-auto pb-[168px]">
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
          <OutfitGroupTabs groups={c.outfitGroups} />

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
          <div className="grid grid-cols-2 gap-3">
            {c.looks.map((look, i) => (
              <div
                key={look}
                className={`relative flex items-end rounded-[18px] p-3 ${
                  i % 2 === 0 ? "ph" : "ph-2"
                }`}
                style={{ aspectRatio: "3 / 4" }}
              >
                <span className="text-[15px] font-semibold text-white/75">{look}</span>
              </div>
            ))}
          </div>

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

          <p
            className="mt-[26px] rounded-[18px] px-4 py-3.5 text-[14px] font-bold leading-snug text-[var(--violet)]"
            style={{ background: "var(--violet-soft)" }}
          >
            Guardá esta colorimetría en tu perfil para verla cuando quieras y generar más outfits
          </p>
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 px-[22px] pt-3"
        style={{
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          background:
            "linear-gradient(to bottom, rgba(247,245,240,0), var(--paper) 22%, var(--paper))",
        }}
      >
        <button type="button" className="btn btn-violet">
          <MaterialIcon name="bookmark" size={20} />
          Guardar en mi perfil
        </button>
        <div className="flex gap-3">
          <button type="button" className="btn btn-outline flex-1 text-[15px]">
            <MaterialIcon name="auto_awesome" size={20} />
            Generar más outfits
          </button>
          <Link href="/colorimetry/new" className="btn btn-outline flex-1 text-[15px]">
            <MaterialIcon name="refresh" size={20} />
            Nueva foto
          </Link>
        </div>
      </div>
    </div>
  );
}
