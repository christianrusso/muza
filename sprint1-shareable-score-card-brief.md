# Brief técnico — Tarjeta compartible del score (Sprint 1)

**Objetivo (roadmap, sección 3.6 y "esta semana"):** que compartir un resultado desde LookLab
comparta una **imagen** con el score, la ocasión y la marca — no un link pelado como hoy. Es la
base del loop de crecimiento "compartí tu score / adiviná el de otro".

## Estado actual del repo (confirmado en código)

- `src/components/analysis/ShareButton.tsx` hoy solo hace `navigator.share({ title, url })`, o
  copia el link al portapapeles si el navegador no soporta Web Share. **No genera ninguna
  imagen.** Si alguien lo comparte a una historia de Instagram, lo único que puede pegar es un
  link suelto.
- No hay ninguna infraestructura de generación de imágenes en el repo (busqué `@vercel/og`,
  `ImageResponse`, `canvas` — nada existe todavía para esto).
- El proyecto usa **Next.js 16.2.9**. Confirmé en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`
  que `ImageResponse` se sigue importando desde `next/og` sin cambios respecto a lo que ya se
  conoce de versiones anteriores — se puede usar con confianza.
- El anillo de score real (`ScoreRing.tsx` / CSS `.ring` en `globals.css`) se dibuja con
  `conic-gradient()`. **Satori (el motor detrás de `ImageResponse`) no soporta `conic-gradient`**,
  así que el anillo hay que rehacerlo con un `<circle>` SVG y `stroke-dasharray` /
  `stroke-dashoffset` (técnica estándar y sí soportada).
- Colores reales de marca (`src/app/globals.css`): `--ink #1a1712`, `--paper #f7f5f0`,
  `--coral #ec5a2e`, `--green #2fa36b` (banda alta, score ≥75), `--amber #f5a524` (banda media,
  60–74), `--red #e5484d` (banda baja, <60) — umbrales confirmados en
  `src/lib/scoring/categories.ts` (`SCORE_BAND_THRESHOLDS`).
- Tipografías (`src/lib/fonts.ts`): `Instrument Serif` (títulos) y `Manrope` (texto). Ambas son
  Google Fonts vía `next/font/google`, que **no sirven directo para `ImageResponse`** — hay que
  descargar los archivos `.ttf`/`.otf` reales y cargarlos con `fs.readFile` (ver ejemplo en la
  doc de `image-response.md`, sección "Custom fonts").
- Datos disponibles por análisis (`src/lib/analyses.ts`, función `getHydratedAnalysis`):
  `overallScore`, `occasionId`, `occasionVariant`, `styleDescriptors`, `qualitativeBadge`,
  `photoUrl`, `analysisType` — todo lo necesario para la tarjeta ya existe, no hace falta traer
  nada nuevo de la base.

## Diseño propuesto (mockup adjunto en el chat)

Dos formatos, mismos elementos:

- **Feed (1080×1080):** fondo con la foto del outfit (borrosa + oscurecida, mismo tratamiento
  visual que ya usa `result/page.tsx`), marca LookLab arriba a la izquierda, anillo de score
  grande centrado (color según banda), ocasión + estilo debajo en itálica, chip con la insignia
  cualitativa, y un pie con "Probá tu outfit gratis · looklab.io".
- **Historia (1080×1920):** mismos elementos, proporciones verticales, anillo más chico y todo
  corrido hacia el tercio inferior (zona segura de Instagram Stories, lejos de los controles de
  arriba y abajo).

No hace falta pedir el diseño a otra herramienta — el mockup ya define layout, tipografía y
paleta con los colores reales de la app; lo que falta es implementarlo.

## Plan técnico

### 1. Ruta de generación de imagen

Crear `src/app/api/analyses/[id]/share-card/route.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getHydratedAnalysis } from "@/lib/analyses";
import { occasionFullLabel } from "@/lib/occasions";
import { scoreBandColorVar } from "@/lib/scoring/categories"; // ojo: devuelve "var(--green)" etc.,
// para ImageResponse hay que devolver el hex real, no la var CSS — ver punto 2.

export const runtime = "nodejs"; // necesita fs para leer las fuentes

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const analysis = await getHydratedAnalysis(id);
  if (!analysis || analysis.overallScore === null) {
    return new Response("Análisis no encontrado o sin puntuar.", { status: 404 });
  }

  const [manrope, instrumentSerif] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Manrope-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/InstrumentSerif-Italic.ttf")),
  ]);

  // ...armar el JSX de la tarjeta acá (ver punto 2 y 3)...

  return new ImageResponse(/* JSX */, {
    width: 1080,
    height: 1080, // 1920 para la variante historia — ver query param abajo
    fonts: [
      { name: "Manrope", data: manrope, weight: 700, style: "normal" },
      { name: "Instrument Serif", data: instrumentSerif, weight: 400, style: "italic" },
    ],
  });
}
```

Notas:
- Agregar un query param `?format=story` (o `?format=feed`, default) para elegir 1080×1080 vs
  1080×1920 desde la misma ruta, en vez de duplicar el endpoint.
- Las fuentes hay que **descargarlas una vez** (Google Fonts las sirve como `.ttf`) y commitearlas
  en `assets/fonts/` — `next/font/google` no expone el buffer crudo del archivo.

### 2. Función de color real (no la CSS var)

`scoreBandColorVar` devuelve strings como `"var(--green)"`, que no sirven dentro de
`ImageResponse` (Satori no resuelve variables CSS de la página). Agregar una función hermana en
`src/lib/scoring/categories.ts`:

```ts
export function scoreBandHex(score: number): string {
  const band = scoreBand(score);
  return band === "high" ? "#2fa36b" : band === "medium" ? "#f5a524" : "#e5484d";
}
```

### 3. El anillo con SVG (reemplazo del conic-gradient)

Dentro del JSX de `ImageResponse`, el anillo se arma con un `<svg>` y dos `<circle>` (fondo +
progreso), igual que cualquier ring de progreso con `stroke-dasharray`:

```tsx
const RADIUS = 86;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const progress = Math.max(0, Math.min(100, overallScore)) / 100;

<svg width="220" height="220" viewBox="0 0 220 220">
  <circle cx="110" cy="110" r={RADIUS} fill="none" stroke="#eae6dc" strokeWidth="14" />
  <circle
    cx="110" cy="110" r={RADIUS} fill="none"
    stroke={scoreBandHex(overallScore)} strokeWidth="14" strokeLinecap="round"
    strokeDasharray={CIRCUMFERENCE}
    strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
    transform="rotate(-90 110 110)"
  />
</svg>
```

(El número del score y "/100" van superpuestos con `position: absolute` dentro de un `div` con
`display: flex` — Satori soporta flexbox y posicionamiento absoluto sin problema.)

### 4. Foto de fondo

`analysis.photoUrl` ya es una URL firmada de Supabase Storage (o data URL en modo demo) — Satori
soporta `<img src="...">` remotas siempre que la URL sea accesible públicamente en el momento del
render (las firmadas duran unos minutos, alcanza). Replicar el mismo tratamiento visual que
`result/page.tsx` ya usa: la foto de fondo + un overlay oscuro con gradiente (en Satori esto se
logra con un `<div>` posicionado encima con `background: linear-gradient(...)`, que sí está
soportado, a diferencia de `conic-gradient`).

### 5. Actualizar `ShareButton`

Hoy comparte solo la URL. Cambiar para que:
- Arme la URL de la tarjeta: `/api/analyses/${analysisId}/share-card` (necesita recibir
  `analysisId` como prop — hoy no lo tiene, hay que agregarlo en `result/page.tsx`:
  `<ShareButton analysisId={id} />`).
- Si el navegador soporta `navigator.canShare({ files })` (Web Share API Level 2), traer la
  imagen (`fetch` + `blob()`), armar un `File` y compartirlo como archivo adjunto — así en
  Instagram/TikTok se puede pegar directo a una historia.
- Si no soporta compartir archivos, fallback actual (compartir el link) pero apuntando a una
  página que tenga esa imagen como Open Graph (`opengraph-image`) para que al menos se vea linda
  en la vista previa del link.

## Checklist de aceptación

- [ ] Ruta `/api/analyses/[id]/share-card` devuelve un PNG válido en 1080×1080 y 1080×1920
      (`?format=story`).
- [ ] El anillo usa el color real de banda (`scoreBandHex`) y el progreso coincide con el score.
- [ ] Se ve la foto del análisis de fondo, con el mismo tratamiento de blur/gradiente que la
      pantalla de resultado.
- [ ] Se ve la ocasión + estilo, la insignia cualitativa, y la marca LookLab.
- [ ] `ShareButton` comparte la imagen como archivo cuando el navegador lo soporta (probar en
      iPhone Safari y Android Chrome), con fallback de link cuando no.
- [ ] Analytics: este share cuenta como el evento `shared` del embudo (ver brief de PostHog) —
      no crear un evento nuevo.
- [ ] Tiempo de generación razonable (Satori es rápido, pero medirlo — si tarda, cachear por
      `analysisId` ya que el resultado no cambia una vez puntuado).
