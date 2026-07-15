import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getHydratedAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { occasionFullLabel } from "@/lib/occasions";
import { scoreBandHex } from "@/lib/scoring/categories";

// Tarjeta compartible del score: PNG con la FOTO del look arriba (nítida) y un
// panel con el anillo, la ocasión, la insignia y la marca abajo. Base del loop de
// crecimiento (compartí tu score). Dos formatos desde la misma ruta: feed
// 1080×1080 (default) y ?format=story 1080×1920 (Instagram Stories).
//
// runtime nodejs: necesitamos fs (fuentes/logo) y sharp (re-encode de la foto).
// Satori (motor de ImageResponse) tiene dos limitaciones que resolvemos acá:
//   - No decodifica JPEG progresivo ni WebP (así vienen las fotos de Supabase):
//     re-encodeamos a JPEG baseline con sharp antes de pasarla.
//   - No maneja object-fit con width/height en % → la foto va con dimensiones en
//     PÍXELES explícitas. Tampoco soporta conic-gradient (anillo como SVG) ni
//     variables CSS (hex reales vía scoreBandHex) ni filter:blur.
export const runtime = "nodejs";

const PAPER = "#f7f5f0";
const INK = "#1a1712";

// Bytes de la foto → JPEG baseline (data URI) que Satori sí decodifica.
async function loadPhotoDataUri(photoPath?: string, photoUrl?: string): Promise<string | null> {
  let input: Buffer | null = null;
  if (photoPath) {
    // Foto del usuario (es su propio análisis): signed URL original (sin transform,
    // que serviría WebP). RLS de dueño permite leerla con su propio cliente.
    const supabase = await createClient();
    const { data: signed } = await supabase.storage.from("outfit-photos").createSignedUrl(photoPath, 300);
    if (signed?.signedUrl) {
      const res = await fetch(signed.signedUrl);
      if (res.ok) input = Buffer.from(await res.arrayBuffer());
    }
  } else if (photoUrl?.startsWith("data:")) {
    // Modo demo: la foto ya viene como data URL.
    const b64 = photoUrl.split(",")[1];
    if (b64) input = Buffer.from(b64, "base64");
  }
  if (!input) return null;
  try {
    const out = await sharp(input)
      .rotate() // respeta orientación EXIF
      .resize(1080, 1400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ progressive: false, quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null; // foto ilegible → tarjeta sin foto (fondo ink)
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isStory = new URL(request.url).searchParams.get("format") === "story";

  const analysis = await getHydratedAnalysis(id);
  if (!analysis || analysis.overallScore === null) {
    return new Response("Análisis no encontrado o sin puntuar.", { status: 404 });
  }

  const [manrope, instrumentSerif, logo, photoDataUri] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Manrope-Bold.woff")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSerif-Italic.woff")),
    readFile(join(process.cwd(), "assets/logo-isotype.png")),
    loadPhotoDataUri(analysis.photoPath, analysis.photoUrl),
  ]);
  const logoDataUri = `data:image/png;base64,${logo.toString("base64")}`;

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
  const ringSize = isStory ? 200 : 170;
  const ringSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ringSize}" height="${ringSize}" viewBox="0 0 220 220"><circle cx="110" cy="110" r="${RADIUS}" fill="none" stroke="#e2ddd2" stroke-width="15"/><circle cx="110" cy="110" r="${RADIUS}" fill="none" stroke="${bandHex}" stroke-width="15" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - progress)}" transform="rotate(-90 110 110)"/></svg>`;
  const ringDataUri = `data:image/svg+xml;base64,${Buffer.from(ringSvg).toString("base64")}`;

  const width = 1080;
  const height = isStory ? 1920 : 1080;
  const photoH = isStory ? 1230 : 620;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", backgroundColor: INK, fontFamily: "Manrope" }}>
        {/* ===== Foto del look (contain, dimensiones en px) sobre fondo ink ===== */}
        <div style={{ position: "relative", display: "flex", width: width, height: photoH, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
          {photoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoDataUri} width={width} height={photoH} alt="" style={{ width: width, height: photoH, objectFit: "contain" }} />
          ) : null}
          {/* gradiente sutil arriba para que se lea la marca */}
          <div style={{ position: "absolute", top: 0, left: 0, width: width, height: 200, background: "linear-gradient(180deg, rgba(20,18,16,0.55), rgba(20,18,16,0))" }} />
          {/* marca arriba a la izquierda: isotipo + wordmark */}
          <div style={{ position: "absolute", top: 44, left: 48, display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoDataUri} width={64} height={64} alt="" />
            <div style={{ display: "flex", marginLeft: 14, fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: 50, color: PAPER }}>LookLab</div>
          </div>
        </div>

        {/* ===== Panel del score ===== */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "center", padding: "0 60px", backgroundColor: INK }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ position: "relative", display: "flex", width: ringSize, height: ringSize, alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ringDataUri} width={ringSize} height={ringSize} alt="" />
              <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", fontSize: isStory ? 84 : 72, fontWeight: 700, color: PAPER, lineHeight: 1 }}>{score}</div>
                <div style={{ display: "flex", fontSize: 22, color: "rgba(247,245,240,0.6)", marginTop: 2 }}>/ 100</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 32, maxWidth: 560 }}>
              <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "rgba(247,245,240,0.55)" }}>OUTFIT SCORE</div>
              <div style={{ display: "flex", marginTop: 8, fontFamily: "Instrument Serif", fontStyle: "italic", fontSize: isStory ? 50 : 44, color: PAPER, lineHeight: 1.1 }}>{occasionAndStyle}</div>
              {analysis.qualitativeBadge ? (
                <div style={{ display: "flex", marginTop: 18, alignSelf: "flex-start", padding: "9px 24px", borderRadius: 999, backgroundColor: "rgba(47,163,107,0.20)", color: "#9fe1cb", fontSize: 26, fontWeight: 700 }}>
                  {analysis.qualitativeBadge}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: isStory ? 90 : 44, display: "flex", fontSize: 26, fontWeight: 700, color: "rgba(247,245,240,0.85)" }}>
            Probá tu outfit gratis · looklab.io
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
