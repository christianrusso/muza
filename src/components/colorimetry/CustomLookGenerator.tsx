"use client";

import { useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Cuántos outfits a medida puede generar el usuario por sesión antes de bloquearse.
const MAX_GENERATIONS = 2;

// El usuario describe una ocasión y se genera UN outfit en su paleta (más barato
// y más personal que elegir de una lista). Los `looks` del análisis quedan como
// chips de sugerencia para prellenar el input.
export function CustomLookGenerator({
  suggestions,
  initial,
}: {
  suggestions: string[];
  initial: { occasion: string; url: string | null } | null;
}) {
  const [occasion, setOccasion] = useState("");
  const [url, setUrl] = useState<string | null>(initial?.url ?? null);
  const [shownOccasion, setShownOccasion] = useState<string | null>(initial?.occasion ?? null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Generar imágenes cuesta plata (~US$0.04 c/u): topamos a MAX_GENERATIONS por
  // sesión. Es un contador de cliente (se reinicia al recargar), no una garantía
  // dura; alcanza para frenar el uso repetido en una misma visita.
  const [count, setCount] = useState(0);
  const limitReached = count >= MAX_GENERATIONS;

  async function generate() {
    const text = occasion.trim();
    if (!text || generating || limitReached) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/colorimetry/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "custom", key: text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message ?? "No se pudo generar el outfit.");
      setUrl(body.url ?? null);
      setShownOccasion(text);
      setOccasion("");
      setCount((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Probá de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {/* Resultado (si ya se generó uno). */}
      {(url || generating) && (
        <div
          className="ph relative mb-3.5 flex items-end overflow-hidden rounded-[18px] p-3"
          style={{
            aspectRatio: "3 / 4",
            ...(url && !generating
              ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : {}),
          }}
        >
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
              <div className="spinner" style={{ width: 32, height: 32, borderTopColor: "var(--violet)" }} />
            </div>
          )}
          {url && !generating && shownOccasion && (
            <span
              className="relative text-[15px] font-semibold text-white/95"
              style={{ textShadow: "0 1px 5px rgba(0,0,0,.7)" }}
            >
              {shownOccasion}
            </span>
          )}
        </div>
      )}

      <input
        type="text"
        value={occasion}
        onChange={(e) => setOccasion(e.target.value)}
        placeholder="Ej: cena con amigos un viernes a la noche"
        maxLength={200}
        disabled={generating || limitReached}
        onKeyDown={(e) => {
          if (e.key === "Enter") generate();
        }}
        className="w-full rounded-[14px] border-2 border-line-strong bg-transparent px-4 py-3 text-[15px] font-semibold outline-none focus:border-[var(--violet)] disabled:opacity-60"
      />

      {/* Chips de sugerencia: prellenan el input. */}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setOccasion(s)}
            disabled={generating || limitReached}
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--violet)] disabled:opacity-60"
            style={{ background: "var(--violet-soft)" }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-2.5 px-1 text-sm font-semibold text-[var(--red)]">{error}</p>}

      {limitReached ? (
        <div
          className="mt-3 flex items-center gap-2.5 rounded-[14px] px-4 py-3.5 text-[14px] font-bold leading-snug text-[var(--violet)]"
          style={{ background: "var(--violet-soft)" }}
        >
          <MaterialIcon name="lock" size={20} className="flex-none" />
          <span>Llegaste al límite de {MAX_GENERATIONS} outfits por ahora. Volvé más tarde para generar otro.</span>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-violet mt-3"
          onClick={generate}
          disabled={!occasion.trim() || generating}
        >
          <MaterialIcon name={generating ? "hourglass_top" : "auto_awesome"} size={20} />
          {generating ? "Generando…" : url ? "Generar otro" : "Generar mi outfit"}
        </button>
      )}
    </>
  );
}
