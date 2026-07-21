"use client";

import { useEffect, useRef, useState } from "react";

// Renderiza los looks como tarjetas. Si todavía no hay imágenes generadas, las
// pide (una sola vez) y muestra un spinner por tarjeta mientras llegan.
export function LookImages({ looks, initialUrls }: { looks: string[]; initialUrls: (string | null)[] }) {
  const hasImages = initialUrls.some(Boolean);
  const [urls, setUrls] = useState<(string | null)[]>(initialUrls);
  const [loading, setLoading] = useState(!hasImages);
  const started = useRef(false);

  useEffect(() => {
    if (hasImages || started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/colorimetry/looks", { method: "POST" });
        const body = await res.json();
        if (res.ok && Array.isArray(body.urls)) setUrls(body.urls);
      } catch {
        // Silencioso: quedan los placeholders. El usuario puede volver a entrar.
      } finally {
        setLoading(false);
      }
    })();
  }, [hasImages]);

  return (
    <div className="grid grid-cols-2 gap-3">
      {looks.map((look, i) => {
        const url = urls[i] ?? null;
        return (
          <div
            key={look}
            className={`relative flex items-end overflow-hidden rounded-[18px] p-3 ${
              i % 2 === 0 ? "ph" : "ph-2"
            }`}
            style={{
              aspectRatio: "3 / 4",
              ...(url
                ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}),
            }}
          >
            {loading && !url && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="spinner"
                  style={{ width: 28, height: 28, borderTopColor: "var(--violet)" }}
                />
              </div>
            )}
            <span
              className="relative text-[15px] font-semibold text-white/90"
              style={url ? { textShadow: "0 1px 4px rgba(0,0,0,.6)" } : undefined}
            >
              {look}
            </span>
          </div>
        );
      })}
    </div>
  );
}
