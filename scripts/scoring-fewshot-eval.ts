// ============================================================================
// LookLab — Eval enfocado del few-shot de comunidad (off vs on)
// ============================================================================
// El harness general (scripts/eval/run.ts) arma su few-shot desde labels.json
// local, NO desde la tabla scoring_examples de Supabase. O sea no ejercita los
// ejemplos de comunidad. Este script sí: usa el CAMINO REAL de producción
// (scoreOutfit + getFewShotExamples) y compara cada foto puntuada sin y con el
// banco de comunidad.
//
// Mide dos cosas, las mismas que pide el doc del pipeline antes de mergear:
//   1. SHIFT   — cuánto baja el score con el few-shot (esperado: hacia el
//                consenso, que estaba ~16 pts por debajo de la IA).
//   2. VARIANZA — desvío de la MISMA foto entre corridas. Si el few-shot lo
//                sube, mete ruido en vez de señal: es el límite a vigilar.
//
// Corre con la condición react-server para poder importar los módulos server-only
// de producción (ver npm run scoring:fewshot-eval).
//
// GASTA PRESUPUESTO DE OpenAI: 2 condiciones × runs llamadas por foto.
//
// Uso:
//   npm run scoring:fewshot-eval                          # ./seed-fotos, casual, 4 fotos, 2 runs
//   npm run scoring:fewshot-eval -- --occasion work --limit 6 --runs 3
//   npm run scoring:fewshot-eval -- --dir ./otras-fotos
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// OPENAI_API_KEY.
// ============================================================================

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

// El few-shot de producción se gatea con este flag. Lo prendemos para la condición
// "on"; la "off" no llama a getFewShotExamples, así que el flag no la afecta.
process.env.SCORING_FEWSHOT_ENABLED = "true";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv(): void {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // No pisar SCORING_FEWSHOT_ENABLED (lo fijamos arriba a propósito).
    if (m[1] === "SCORING_FEWSHOT_ENABLED") continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}
loadEnv();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function dataUrl(path: string): string {
  const ext = extname(path).toLowerCase();
  const b64 = readFileSync(path).toString("base64");
  return `data:${MIME[ext] ?? "image/jpeg"};base64,${b64}`;
}

function listImages(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .sort()
    .map((f) => join(dir, f));
}

async function main() {
  // Imports dinámicos: recién acá, con el flag ya seteado y bajo la condición
  // react-server, se pueden traer los módulos server-only de producción.
  const { scoreOutfit } = await import("@/lib/ai/scoreOutfit");
  const { getFewShotExamples } = await import("@/lib/scoring/knowledgeBase");
  const { computeOverallScore, spreadScore } = await import("@/lib/scoring/categories");
  const { occasionLabel } = await import("@/lib/occasions");
  const { createAdminClient } = await import("@/lib/supabase/admin");
  type OccId = import("@/types/domain").OccasionId;

  const dir = resolve(arg("dir") ?? "./seed-fotos");
  const occasionId = (arg("occasion") ?? "casual") as OccId;
  const limit = Number(arg("limit") ?? 4);
  const runs = Number(arg("runs") ?? 2);

  if (!existsSync(dir)) {
    console.error(`✖ No existe la carpeta de fotos: ${dir}`);
    process.exit(1);
  }
  const files = listImages(dir).slice(0, limit);
  if (!files.length) {
    console.error(`✖ Sin imágenes en ${dir}`);
    process.exit(1);
  }

  const occLabel = occasionLabel(occasionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  console.log(`\n═══ Eval few-shot comunidad — off vs on ═══`);
  console.log(`Ocasión: ${occLabel} · fotos: ${files.length} · runs: ${runs}`);
  console.log(`Llamadas OpenAI: ${files.length * runs * 2} (2 condiciones × ${runs} runs × ${files.length} fotos)\n`);

  const overallOf = (categories: { key: string; score: number }[], type: "completo") =>
    // Mismo cálculo que el route de producción: promedio ponderado → techo →
    // estiramiento. spreadScore aplica a la comparación igual que al usuario real.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    spreadScore(computeOverallScore(categories as any, type));

  const perPhoto: { file: string; meanOff: number; meanOn: number; sdOff: number; sdOn: number }[] = [];

  for (const file of files) {
    const url = dataUrl(file);
    const offRuns: number[] = [];
    const onRuns: number[] = [];

    for (let r = 0; r < runs; r++) {
      // OFF: sin ejemplos (comportamiento actual).
      const off = await scoreOutfit({
        photoUrl: url,
        occasionLabel: occLabel,
        analysisType: "completo",
        examples: [],
      });
      offRuns.push(overallOf(off.categories, "completo"));

      // ON: ejemplos de comunidad frescos desde Supabase (signed URLs nuevas por
      // foto, para no chocar con el TTL de 5 min si la corrida es larga).
      const examples = await getFewShotExamples(admin, occasionId);
      const on = await scoreOutfit({
        photoUrl: url,
        occasionLabel: occLabel,
        analysisType: "completo",
        examples,
      });
      onRuns.push(overallOf(on.categories, "completo"));

      const tag = file.split("/").pop();
      console.log(
        `  ${tag} · run ${r + 1}: off ${offRuns[r]}  on ${onRuns[r]}  (Δ ${onRuns[r] - offRuns[r]})` +
          (examples.length ? "" : "  ⚠ 0 ejemplos"),
      );
    }

    perPhoto.push({
      file: file.split("/").pop() ?? file,
      meanOff: mean(offRuns),
      meanOn: mean(onRuns),
      sdOff: stdev(offRuns),
      sdOn: stdev(onRuns),
    });
  }

  // Agregados.
  const shifts = perPhoto.map((p) => p.meanOn - p.meanOff);
  const meanShift = mean(shifts);
  const meanSdOff = mean(perPhoto.map((p) => p.sdOff));
  const meanSdOn = mean(perPhoto.map((p) => p.sdOn));

  console.log(`\n─── Por foto ───`);
  console.log(`  ${"foto".padEnd(24)} ${"off".padStart(5)} ${"on".padStart(5)} ${"Δ".padStart(6)}  ${"sd_off".padStart(6)} ${"sd_on".padStart(6)}`);
  for (const p of perPhoto) {
    const d = p.meanOn - p.meanOff;
    console.log(
      `  ${p.file.slice(0, 24).padEnd(24)} ${p.meanOff.toFixed(0).padStart(5)} ${p.meanOn.toFixed(0).padStart(5)} ${(d >= 0 ? "+" : "") + d.toFixed(1)}`.padEnd(46) +
        `  ${p.sdOff.toFixed(1).padStart(6)} ${p.sdOn.toFixed(1).padStart(6)}`,
    );
  }

  console.log(`\n─── Resumen ───`);
  console.log(`SHIFT medio (on − off): ${(meanShift >= 0 ? "+" : "") + meanShift.toFixed(1)} pts`);
  console.log(`  ${shiftReading(meanShift)}`);
  console.log(`VARIANZA (desvío misma foto): off ${meanSdOff.toFixed(1)} → on ${meanSdOn.toFixed(1)}`);
  console.log(`  ${varianceReading(meanSdOff, meanSdOn)}\n`);
}

function shiftReading(shift: number): string {
  if (shift <= -8) return "→ El few-shot baja la escala con fuerza hacia el consenso. Es lo buscado.";
  if (shift <= -2) return "→ Baja el score, en la dirección esperada, pero suave. Ver si alcanza para cerrar el gap de −16.";
  if (shift < 2) return "→ Casi no mueve el score. El few-shot no está calibrando; revisar los ejemplos.";
  return "→ SUBE el score: efecto contrario al buscado. No mergear así.";
}

function varianceReading(off: number, on: number): string {
  if (on <= off + 1) return "→ No agrega ruido: la varianza se mantiene. OK para mergear.";
  if (on <= off + 3) return "→ Sube algo la varianza. Aceptable, pero vigilar (el doc marca ±8 como límite).";
  return "→ Sube MUCHO la varianza: el few-shot mete ruido. Peligro de score inestable (se comparte). No mergear.";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
