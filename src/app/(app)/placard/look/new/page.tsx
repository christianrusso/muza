"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";

const OCCASIONS = [
  { id: "casual", label: "Casual", icon: "checkroom" },
  { id: "trabajo", label: "Trabajo", icon: "work" },
  { id: "fiesta", label: "Fiesta", icon: "local_bar" },
  { id: "casamiento", label: "Casamiento", icon: "diamond" },
  { id: "cita", label: "Cita", icon: "favorite" },
  { id: "viaje", label: "Viaje", icon: "flight" },
];

const CLIMA = ["Templado", "Frío", "Calor"];
const CLIMA_ICON: Record<string, string> = { Templado: "", Frío: "ac_unit", Calor: "wb_sunny" };
const FORMALIDAD = ["Relajado", "Equilibrado", "Formal"];

// Selección en violeta (la familia de color del Placard/looks), a diferencia del
// coral que usa el análisis de outfit.
const VIOLET = "var(--violet)";

export default function NewLookPage() {
  const router = useRouter();
  const [occasion, setOccasion] = useState("fiesta");
  const [context, setContext] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(true);
  const [clima, setClima] = useState("Templado");
  const [formalidad, setFormalidad] = useState("Equilibrado");

  return (
    <div className="screen-body pad">
      <ScreenHead title="Armá tu look" backHref="/placard" />
      <p className="-mt-4 text-sm font-semibold text-muted">
        Elegí la ocasión y armamos un look con tu ropa
      </p>

      <span className="mt-2 text-[15px] font-extrabold text-ink">Ocasión</span>
      <div className="grid grid-cols-3 gap-[11px]">
        {OCCASIONS.map((o) => {
          const sel = occasion === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOccasion(o.id)}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 py-4 text-xs font-bold transition-all"
              style={{
                borderColor: sel ? VIOLET : "var(--line-strong)",
                background: sel ? "var(--violet-soft)" : "#fff",
                color: sel ? VIOLET : "var(--ink)",
              }}
            >
              <MaterialIcon name={o.icon} size={26} className={sel ? "" : "text-muted"} />
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <span className="mb-2 block text-[15px] font-extrabold text-ink">Contanos más (opcional)</span>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          placeholder="Ej. cena informal, hace frío, quiero algo elegante pero cómodo"
          className="w-full resize-none rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[15px] font-semibold leading-snug outline-none placeholder:font-medium placeholder:text-muted focus:border-[color:var(--violet)]"
        />
      </div>

      <div
        className="mt-2 rounded-2xl border-[1.5px]"
        style={{ borderColor: prefsOpen ? "var(--amber)" : "var(--line-strong)" }}
      >
        <button
          type="button"
          onClick={() => setPrefsOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 px-4 py-3.5"
        >
          <MaterialIcon name="tune" size={22} className="text-[var(--violet)]" />
          <span className="flex-1 text-left text-[15px] font-extrabold text-ink">Preferencias</span>
          <MaterialIcon name={prefsOpen ? "expand_less" : "expand_more"} size={22} className="text-muted" />
        </button>

        {prefsOpen && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            <span className="section-label">Clima</span>
            <div className="flex flex-wrap gap-2">
              {CLIMA.map((c) => {
                const sel = clima === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setClima(c)}
                    className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-colors"
                    style={{
                      background: sel ? VIOLET : "#fff",
                      border: `1.5px solid ${sel ? VIOLET : "var(--line-strong)"}`,
                      color: sel ? "#fff" : "var(--muted)",
                    }}
                  >
                    {CLIMA_ICON[c] && <MaterialIcon name={CLIMA_ICON[c]} size={15} />}
                    {c}
                  </button>
                );
              })}
            </div>

            <span className="section-label mt-1">Formalidad</span>
            <div className="flex flex-wrap gap-2">
              {FORMALIDAD.map((f) => {
                const sel = formalidad === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormalidad(f)}
                    className="flex h-9 items-center rounded-full px-4 text-[13px] font-bold transition-colors"
                    style={{
                      background: sel ? VIOLET : "#fff",
                      border: `1.5px solid ${sel ? VIOLET : "var(--line-strong)"}`,
                      color: sel ? "#fff" : "var(--muted)",
                    }}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Button
        className="btn-violet mt-auto"
        onClick={() => router.push("/placard/look/generating")}
      >
        <MaterialIcon name="auto_awesome" size={20} />
        Generar mi look
      </Button>
    </div>
  );
}
