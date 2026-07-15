import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getHydratedAnalysis } from "@/lib/analyses";
import { occasionFullLabel } from "@/lib/occasions";
import { scoreBandHex } from "@/lib/scoring/categories";

// Tarjeta compartible del score: PNG con el anillo, la ocasión, la insignia y la
// marca, sobre la foto del outfit. Base del loop de crecimiento (compartí tu
// score). Dos formatos desde la misma ruta: feed 1080×1080 (default) y
// ?format=story 1080×1920 (proporciones de Instagram Stories).
//
// runtime nodejs: necesitamos fs para leer las fuentes (next/font/google no
// expone el buffer crudo). Satori (motor de ImageResponse) NO soporta
// conic-gradient (por eso el anillo va como SVG) ni variables CSS (por eso los
// hex reales vía scoreBandHex).
export const runtime = "nodejs";

const PAPER = "#f7f5f0";
const INK = "#1a1712";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isStory = new URL(request.url).searchParams.get("format") === "story";

  const analysis = await getHydratedAnalysis(id);
  if (!analysis || analysis.overallScore === null) {
    return new Response("Análisis no encontrado o sin puntuar.", { status: 404 });
  }

  const [manrope, instrumentSerif] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Manrope-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSerif-Italic.woff")),
  ]);

  const score = analysis.overallScore;
  const bandHex = scoreBandHex(score);
  const occasionAndStyle = [
    occasionFullLabel(analysis.occasionId, analysis.occasionVariant),
    ...analysis.styleDescriptors,
  ]
    .filter(Boolean)
    .join(" · ");

  // Anillo de progreso como SVG (data-URI): dos círculos, el de progreso recortado
  // con stroke-dasharray/offset. Robusto en Satori (se renderiza como imagen).
  const RADIUS = 86;
  const C = 2 * Math.PI * RADIUS;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const ringSize = isStory ? 240 : 300;
  const ringSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ringSize}" height="${ringSize}" viewBox="0 0 220 220"><circle cx="110" cy="110" r="${RADIUS}" fill="none" stroke="rgba(247,245,240,0.22)" stroke-width="16"/><circle cx="110" cy="110" r="${RADIUS}" fill="none" stroke="${bandHex}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - progress)}" transform="rotate(-90 110 110)"/></svg>`;
  const ringDataUri = `data:image/svg+xml;base64,${Buffer.from(ringSvg).toString("base64")}`;

  const width = 1080;
  const height = isStory ? 1920 : 1080;

  const centerBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div style={{ display: "flex", position: "relative", width: ringSize, height: ringSize, alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ringDataUri} width={ringSize} height={ringSize} alt="" />
        <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: isStory ? 108 : 132, fontWeight: 700, color: PAPER, lineHeight: 1 }}>{score}</div>
          <div style={{ display: "flex", fontSize: 30, color: "rgba(247,245,240,0.7)", marginTop: 4 }}>/ 100</div>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 28, fontSize: 26, letterSpacing: 4, color: "rgba(247,245,240,0.65)" }}>
        OUTFIT SCORE
      </div>
      <div style={{ display: "flex", marginTop: 14, fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: isStory ? 52 : 58, color: PAPER, textAlign: "center", maxWidth: 900 }}>
        {occasionAndStyle}
      </div>
      {analysis.qualitativeBadge ? (
        <div style={{ display: "flex", marginTop: 26, padding: "12px 30px", borderRadius: 999, backgroundColor: "rgba(47,163,107,0.20)", color: "#9fe1cb", fontSize: 30, fontWeight: 700 }}>
          {analysis.qualitativeBadge}
        </div>
      ) : null}
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", backgroundColor: INK, fontFamily: "Manrope" }}>
        {analysis.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={analysis.photoUrl}
            width={width}
            height={height}
            alt=""
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px)", transform: "scale(1.15)" }}
          />
        ) : null}
        {/* Overlay oscuro (gradiente sí soportado por Satori, conic-gradient no). */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "linear-gradient(180deg, rgba(26,23,18,0.55), rgba(26,23,18,0.82))" }} />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: isStory ? "96px 80px 220px" : "80px",
            justifyContent: isStory ? "flex-end" : "space-between",
          }}
        >
          {/* Marca arriba a la izquierda (absoluta para no empujar el layout en story). */}
          <div style={{ position: "absolute", top: isStory ? 110 : 80, left: 80, display: "flex", fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 62, color: PAPER }}>
            LookLab
          </div>

          {centerBlock}

          <div style={{ display: "flex", justifyContent: "center", marginTop: 48, fontSize: 28, fontWeight: 700, color: "rgba(247,245,240,0.9)" }}>
            Probá tu outfit gratis · looklab.app
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Manrope", data: manrope, weight: 700, style: "normal" },
        { name: "Instrument Serif", data: instrumentSerif, weight: 400, style: "italic" },
      ],
    },
  );
}
