// ============================================================================
// Muza — Harness de evaluación de la IA (validación + scoring)
// ============================================================================
// Corre una carpeta de fotos por los MISMOS prompts y schemas que usa
// producción (src/lib/ai/*), y vuelca los resultados a un reporte que podés
// mirar de un saque. La idea es tener un baseline reproducible para medir el
// impacto de cada cambio (prompt, modelo, temperature, few-shot, etc.).
//
// Reutiliza el código real de prod (no una copia) para que lo que medís sea
// exactamente lo que corre en la app:
//   - buildValidationPrompt / ValidationResultSchema
//   - buildScoringPrompt   / ScoringResultSchema
//   - computeOverallScore  / SCORE_CATEGORIES
//
// Uso:
//   npm run eval:ai -- --dir /ruta/a/mis/100-fotos            # SIN --occasion: chequea cada foto contra TODAS las ocasiones
//   npm run eval:ai -- --dir ./eval-images --occasion work    # solo esa ocasión
//   npm run eval:ai -- --dir ./eval-images --limit 10         # probar con 10
//   npm run eval:ai -- --dir ./eval-images --runs 3           # medir varianza
//   npm run eval:ai -- --dir ./eval-images --temperature 0    # forzar temp
//   npm run eval:ai -- --dir ./eval-images --model gpt-4.1    # comparar modelo
//
// Nota: recorre subcarpetas. Sin --occasion, hace 1 validación por foto y
// 1 scoring por ocasión (9), así que el costo de scoring se multiplica ×9.
//
// Requiere OPENAI_API_KEY en .env.local. Salida en scripts/eval/out/<timestamp>/.
// ============================================================================

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, extname, basename } from "node:path";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { buildValidationPrompt } from "@/lib/ai/prompts/validation.prompt";
import { buildScoringPrompt } from "@/lib/ai/prompts/scoring.prompt";
import {
  ValidationResultSchema,
  ScoringResultSchema,
  type ValidationResult,
  type ScoringResult,
} from "@/lib/ai/schema";
import { computeOverallScore, spreadScore, scoreLevelLabel, SCORE_CATEGORIES } from "@/lib/scoring/categories";
import { OCCASIONS, occasionLabel } from "@/lib/occasions";
import type { OccasionId } from "@/types/domain";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// ---- Cargar .env.local sin dependencias externas (igual que seed-photos) ----
function loadEnv(): Record<string, string> {
  const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

// ---- Args de CLI ----
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string): string | undefined => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    dir: get("dir"),
    limit: get("limit") ? Number(get("limit")) : Infinity,
    runs: get("runs") ? Number(get("runs")) : 1,
    occasion: get("occasion") as OccasionId | undefined,
    // temperature 0 por defecto (consistencia, igual que prod). Overridable, ej. --temperature 0.7 para medir varianza.
    temperature: get("temperature") !== undefined ? Number(get("temperature")) : 0,
    concurrency: get("concurrency") ? Number(get("concurrency")) : 4,
    model: get("model"),
    // --fewshot: inyecta ejemplos etiquetados de labels.json en el prompt de scoring
    fewshot: args.includes("--fewshot"),
    // --fewshot-max N: máximo de ejemplos por llamada (default 4)
    fewshotMax: get("fewshot-max") ? Number(get("fewshot-max")) : 4,
    // --skip-scored: saltea las fotos ya evaluadas en corridas previas (solo las nuevas)
    skipScored: args.includes("--skip-scored"),
    // --verbose / -v: log detallado (cada ocasión a medida que se scorea)
    verbose: args.includes("--verbose") || args.includes("-v"),
    // --only-labeled: corre solo sobre las fotos que ya tienen etiqueta en labels.json
    // (para medir, no re-scorear toda la carpeta)
    onlyLabeled: args.includes("--only-labeled"),
  };
}

// ---- Ejemplo de referencia para few-shot (sale de labels.json) ----
interface FewShotExample {
  file: string; // ruta relativa a imgDir
  path: string; // ruta absoluta
  verdict: "good" | "bad";
  note: string;
}

// Elige ejemplos balanceando 👍/👎 (mitad y mitad) para no sesgar al modelo
// cuando el banco de una ocasión está cargado hacia un lado (ej. gym 6👍/15👎).
// Si una clase tiene menos, rellena con la otra hasta llegar a `max`.
function pickBalancedExamples(pool: FewShotExample[], max: number): FewShotExample[] {
  const good = pool.filter((e) => e.verdict === "good");
  const bad = pool.filter((e) => e.verdict === "bad");
  const half = Math.floor(max / 2);
  const picked = [...good.slice(0, half), ...bad.slice(0, max - half)];
  if (picked.length < max) {
    const rest = [...good.slice(half), ...bad.slice(max - half)];
    picked.push(...rest.slice(0, max - picked.length));
  }
  return picked;
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Hora actual HH:MM:SS para los logs.
const hhmmss = (): string => new Date().toTimeString().slice(0, 8);

// Reintenta un llamado a la API ante 429 (rate limit), esperando lo que sugiere
// la respuesta ("try again in Xs") o con backoff exponencial. Devuelve el
// resultado o relanza el último error si se agotan los intentos.
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 7;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const code = (err as { code?: string })?.code;
      const msg = err instanceof Error ? err.message : String(err);
      // Cuota/billing agotada: NO es temporal → cortar ya, sin gastar reintentos.
      const isQuota = code === "insufficient_quota" || /quota|billing/i.test(msg);
      if (status === 429 && !isQuota && attempt < maxAttempts) {
        const m = /try again in ([\d.]+)s/.exec(msg);
        const waitMs = m ? Math.ceil(parseFloat(m[1]) * 1000) + 300 : Math.min(2 ** attempt * 600, 10000);
        console.log(`  ⏳ [${hhmmss()}] rate limit — reintento ${attempt}/${maxAttempts - 1} en ${(waitMs / 1000).toFixed(1)}s`);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }
      throw err;
    }
  }
}

// Lista imágenes de forma recursiva; devuelve rutas relativas a `dir`
// (ej. "Men full outfit/foto.jpg"), que sirven como clave única de etiquetado.
function listImagesRecursive(dir: string): string[] {
  return readdirSync(dir, { recursive: true })
    .map((e) => String(e))
    .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()));
}

function imageToDataUrl(path: string): string {
  const ext = extname(path).toLowerCase();
  const b64 = readFileSync(path).toString("base64");
  return `data:${MIME[ext] ?? "image/jpeg"};base64,${b64}`;
}

interface CallMeta {
  ms: number;
  inputTokens: number;
  outputTokens: number;
}

interface RunResult {
  run: number;
  validation: ValidationResult | null;
  scoring: ScoringResult | null;
  overall: number | null;
  validationMeta: CallMeta | null;
  scoringMeta: CallMeta | null;
  error: string | null;
}

interface ImageResult {
  file: string;
  path: string;
  occasionId: OccasionId;
  occasionLabel: string;
  // Clave de etiquetado: por archivo si hay una sola ocasión (compatible con
  // labels.json viejo), o "archivo · ocasión" cuando se corren varias.
  labelKey: string;
  runs: RunResult[];
}

async function main() {
  const opts = parseArgs();
  if (!opts.dir) {
    console.error("✖ Falta --dir /ruta/a/las/fotos");
    process.exit(1);
  }

  // Sin --occasion: se chequea la foto contra TODAS las ocasiones.
  // Con --occasion <id>: solo esa.
  if (opts.occasion !== undefined && !OCCASIONS.some((o) => o.id === opts.occasion)) {
    console.error(`✖ Ocasión inválida: "${opts.occasion}"`);
    console.error(`  Válidas: ${OCCASIONS.map((o) => `${o.id} (${o.label})`).join(", ")}`);
    process.exit(1);
  }
  const occasions: OccasionId[] = opts.occasion ? [opts.occasion] : OCCASIONS.map((o) => o.id);
  const multiOcc = occasions.length > 1;

  const env = loadEnv();
  const apiKey = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("✖ Falta OPENAI_API_KEY en .env.local");
    process.exit(1);
  }
  const model = opts.model ?? env.OPENAI_VISION_MODEL ?? "gpt-4o";
  const client = new OpenAI({ apiKey });
  const occDisplay = multiOcc
    ? `todas (${occasions.length}: ${occasions.join(", ")})`
    : occasionLabel(occasions[0]);

  const imgDir = resolve(opts.dir);
  let files = listImagesRecursive(imgDir).sort();

  if (files.length === 0) {
    console.error(`✖ No encontré imágenes (${[...IMAGE_EXTS].join(", ")}) en ${imgDir}`);
    process.exit(1);
  }

  // --skip-scored: saltear las fotos que ya fueron evaluadas en alguna corrida
  // previa (out/*/results.json). Sirve para scorear SOLO las nuevas y no gastar
  // API en las de siempre. Las etiquetas viejas (labels.json) no se tocan.
  if (opts.skipScored) {
    const scored = new Set<string>();
    const outRoot = join(__dirname, "out");
    if (existsSync(outRoot)) {
      for (const d of readdirSync(outRoot)) {
        const rj = join(outRoot, d, "results.json");
        if (!existsSync(rj)) continue;
        try {
          const prev = JSON.parse(readFileSync(rj, "utf8")) as {
            results?: { file: string; runs?: { error: string | null }[] }[];
          };
          // Una foto cuenta como "evaluada" solo si TODAS sus combinaciones
          // (ocasión×corrida) salieron sin error. Si alguna falló (ej. sin cuota),
          // NO se marca como hecha → se re-scorea en la próxima corrida.
          const okInThisRun = new Map<string, boolean>();
          for (const r of prev.results ?? []) {
            const hadError = (r.runs ?? []).some((run) => run.error);
            okInThisRun.set(r.file, (okInThisRun.get(r.file) ?? true) && !hadError);
          }
          for (const [file, ok] of okInThisRun) if (ok) scored.add(file);
        } catch {
          // corrida corrupta o incompleta → la ignoramos
        }
      }
    }
    const before = files.length;
    files = files.filter((f) => !scored.has(f));
    console.log(`\n📌 --skip-scored: ${before - files.length} ya evaluadas · ${files.length} nuevas`);
    if (files.length === 0) {
      console.log("✔ No hay fotos nuevas para evaluar. Nada que hacer.\n");
      process.exit(0);
    }
  }

  // --only-labeled: quedarse solo con las fotos que ya tienen alguna etiqueta
  // de scoring en labels.json (para medir sobre el set etiquetado, no toda la carpeta).
  if (opts.onlyLabeled) {
    const labelsPath = join(__dirname, "labels.json");
    const labeled = new Set<string>();
    if (existsSync(labelsPath)) {
      const labels: Record<string, { scoring?: string | null }> = JSON.parse(
        readFileSync(labelsPath, "utf8"),
      );
      for (const [key, val] of Object.entries(labels)) {
        if (!key.includes(" · ")) continue;
        if (val.scoring === "good" || val.scoring === "bad") {
          labeled.add(key.slice(0, key.lastIndexOf(" · ")));
        }
      }
    }
    const before = files.length;
    files = files.filter((f) => labeled.has(f));
    console.log(`\n📌 --only-labeled: ${files.length} fotos etiquetadas (de ${before} en la carpeta)`);
    if (files.length === 0) {
      console.log("✔ No hay fotos etiquetadas para medir. Nada que hacer.\n");
      process.exit(0);
    }
  }

  files = files.slice(0, opts.limit);

  // ---- Banco de ejemplos para few-shot (solo con --fewshot) ----
  // Se arma desde labels.json, indexado por rótulo de ocasión. Solo entran
  // entradas con scoring 👍/👎 cuya imagen exista en la carpeta de la corrida.
  const fewShotByOcc = new Map<string, FewShotExample[]>();
  if (opts.fewshot) {
    const labelsPath = join(__dirname, "labels.json");
    const labels: Record<string, { scoring?: string | null; note?: string }> = existsSync(labelsPath)
      ? JSON.parse(readFileSync(labelsPath, "utf8"))
      : {};
    for (const [key, val] of Object.entries(labels)) {
      if (!key.includes(" · ")) continue; // saltear entradas sin ocasión (viejas)
      const sep = key.lastIndexOf(" · ");
      const relFile = key.slice(0, sep);
      const occLabel = key.slice(sep + 3);
      if (val.scoring !== "good" && val.scoring !== "bad") continue;
      const p = join(imgDir, relFile);
      if (!existsSync(p)) continue; // la foto de ejemplo tiene que existir en esta carpeta
      const arr = fewShotByOcc.get(occLabel) ?? [];
      arr.push({ file: relFile, path: p, verdict: val.scoring, note: val.note ?? "" });
      fewShotByOcc.set(occLabel, arr);
    }
    const total = [...fewShotByOcc.values()].reduce((s, a) => s + a.length, 0);
    console.log(`\n🔎 few-shot ON — ${total} ejemplos etiquetados en ${fewShotByOcc.size} ocasiones`);
  }

  const scoreCalls = files.length * occasions.length * opts.runs;
  const valCalls = files.length * opts.runs;
  console.log(`\n→ ${files.length} imágenes · modelo ${model} · ocasión "${occDisplay}"${opts.fewshot ? " · few-shot" : ""}`);
  console.log(`  runs por imagen: ${opts.runs} · temperature: ${opts.temperature ?? "(default del modelo)"}`);
  console.log(`  llamadas OpenAI estimadas: ${valCalls} validación + ${scoreCalls} scoring = ${valCalls + scoreCalls}\n`);

  // Cache de data-urls de imágenes de ejemplo (para no releerlas en cada llamada)
  const exampleDataUrlCache = new Map<string, string>();
  const exampleDataUrl = (p: string): string => {
    let d = exampleDataUrlCache.get(p);
    if (!d) {
      d = imageToDataUrl(p);
      exampleDataUrlCache.set(p, d);
    }
    return d;
  };

  // ---- Una llamada de validación ----
  async function validate(dataUrl: string): Promise<{ result: ValidationResult; meta: CallMeta }> {
    const t0 = Date.now();
    const response = await withRetry(() => client.responses.parse({
      model,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      input: [
        { role: "system", content: buildValidationPrompt() },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Validá esta foto de outfit." },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        },
      ],
      text: { format: zodTextFormat(ValidationResultSchema, "validation_result") },
    }));
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("validación sin output_parsed");
    return {
      result: parsed,
      meta: {
        ms: Date.now() - t0,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }

  // ---- Una llamada de scoring ----
  async function score(
    dataUrl: string,
    analysisType: ValidationResult["analysisType"],
    scoreOccasionLabel: string,
    examples: FewShotExample[],
  ): Promise<{ result: ScoringResult; meta: CallMeta }> {
    const t0 = Date.now();

    // Contenido few-shot: por cada ejemplo, el veredicto humano + su nota + la
    // imagen de referencia (detail "low" para gastar menos tokens que la foto real).
    const userContent: Array<
      | { type: "input_text"; text: string }
      | { type: "input_image"; image_url: string; detail: "low" | "high" }
    > = [];
    if (examples.length) {
      userContent.push({
        type: "input_text",
        text: `Antes de puntuar, mirá estos ejemplos de referencia ya evaluados por un experto humano para la ocasión "${scoreOccasionLabel}". Reflejan el nivel de exigencia esperado: un outfit inadecuado para la ocasión debe puntuar bajo aunque esté bien armado en sí mismo.`,
      });
      examples.forEach((ex, i) => {
        const verdictTxt = ex.verdict === "good" ? "ADECUADO ✓" : "NO ADECUADO ✗";
        userContent.push({
          type: "input_text",
          text: `Ejemplo ${i + 1} — ${verdictTxt} para "${scoreOccasionLabel}".${ex.note ? ` Nota del experto: "${ex.note}"` : ""}`,
        });
        userContent.push({ type: "input_image", image_url: exampleDataUrl(ex.path), detail: "low" });
      });
      userContent.push({
        type: "input_text",
        text: "Ahora, con ese mismo criterio, analizá y puntuá la foto del usuario:",
      });
    } else {
      userContent.push({ type: "input_text", text: "Analizá y puntuá este outfit." });
    }
    userContent.push({ type: "input_image", image_url: dataUrl, detail: "high" });

    const response = await withRetry(() => client.responses.parse({
      model,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      input: [
        {
          role: "system",
          content: buildScoringPrompt({
            occasionLabel: scoreOccasionLabel,
            analysisType: analysisType ?? "completo",
          }),
        },
        { role: "user", content: userContent },
      ],
      text: { format: zodTextFormat(ScoringResultSchema, "scoring_result") },
    }));
    const parsed = response.output_parsed;
    if (!parsed) throw new Error("scoring sin output_parsed");
    return {
      result: parsed,
      meta: {
        ms: Date.now() - t0,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }

  // ---- Procesar una imagen: valida 1 vez por corrida (la validación no
  // depende de la ocasión) y puntúa una vez por cada ocasión pedida.
  // Devuelve un ImageResult por ocasión (misma foto, distinto score). ----
  async function processImage(file: string): Promise<ImageResult[]> {
    if (opts.verbose) console.log(`▶ [${hhmmss()}] ${file}`);
    const path = join(imgDir, file);
    const dataUrl = imageToDataUrl(path);
    // runs acumulados por ocasión
    const runsByOcc = new Map<OccasionId, RunResult[]>();
    for (const occ of occasions) runsByOcc.set(occ, []);

    for (let r = 1; r <= opts.runs; r++) {
      let v: { result: ValidationResult; meta: CallMeta } | null = null;
      let valError: string | null = null;
      try {
        v = await validate(dataUrl);
      } catch (err) {
        valError = err instanceof Error ? err.message : String(err);
      }

      for (const occ of occasions) {
        if (valError || !v) {
          runsByOcc.get(occ)!.push({
            run: r,
            validation: null,
            scoring: null,
            overall: null,
            validationMeta: null,
            scoringMeta: null,
            error: valError,
          });
          continue;
        }
        try {
          let sc: { result: ScoringResult; meta: CallMeta } | null = null;
          // Igual que prod: solo puntuamos si la foto es analizable.
          if (v.result.verdict !== "invalid") {
            // Few-shot: ejemplos de esta ocasión, EXCLUYENDO la foto actual (leave-one-out).
            const examples = opts.fewshot
              ? pickBalancedExamples(
                  (fewShotByOcc.get(occasionLabel(occ)) ?? []).filter((e) => e.file !== file),
                  opts.fewshotMax,
                )
              : [];
            sc = await score(dataUrl, v.result.analysisType, occasionLabel(occ), examples);
          }
          const overall = sc ? computeOverallScore(sc.result.categories, sc.result.analysisType) : null;
          runsByOcc.get(occ)!.push({
            run: r,
            validation: v.result,
            scoring: sc?.result ?? null,
            overall,
            validationMeta: v.meta,
            scoringMeta: sc?.meta ?? null,
            error: null,
          });
          if (opts.verbose)
            console.log(`   [${hhmmss()}] ${basename(file)} · ${occasionLabel(occ)} → ${overall ?? "n/a"}`);
        } catch (err) {
          const emsg = err instanceof Error ? err.message : String(err);
          runsByOcc.get(occ)!.push({
            run: r,
            validation: v.result,
            scoring: null,
            overall: null,
            validationMeta: v.meta,
            scoringMeta: null,
            error: emsg,
          });
          if (opts.verbose)
            console.log(`   [${hhmmss()}] ${basename(file)} · ${occasionLabel(occ)} ✖ ${emsg.slice(0, 45)}`);
        }
      }
    }

    return occasions.map((occ) => {
      const label = occasionLabel(occ);
      return {
        file,
        path,
        occasionId: occ,
        occasionLabel: label,
        labelKey: multiOcc ? `${file} · ${label}` : file,
        runs: runsByOcc.get(occ)!,
      };
    });
  }

  // ---- Cola con concurrencia limitada (por imagen) ----
  const queue = [...files];
  const results: ImageResult[] = [];
  let done = 0;
  async function worker() {
    for (;;) {
      const file = queue.shift();
      if (!file) return;
      const res = await processImage(file);
      results.push(...res);
      done++;
      const runs0 = res.map((r) => r.runs[0]);
      const errCount = runs0.filter((r) => r.error).length;
      const okCount = runs0.filter((r) => r.scoring).length;
      const verdict = runs0.map((r) => r.validation?.verdict).find(Boolean) ?? "—";
      const flag = errCount ? `✖ ${errCount} error` : "✓";
      console.log(
        `${flag} [${hhmmss()}] ${done}/${files.length}  ${file}  · val:${verdict} · scoring ${okCount}/${res.length}`,
      );
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: opts.concurrency }, worker));
  results.sort(
    (a, b) => a.file.localeCompare(b.file) || a.occasionId.localeCompare(b.occasionId),
  );
  console.log(`\n\n✔ Listo en ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

  // ---- Guardar salida ----
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = join(__dirname, "out", stamp);
  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    join(outDir, "results.json"),
    JSON.stringify({ model, occasion: occDisplay, opts, results }, null, 2),
  );
  writeFileSync(join(outDir, "results.csv"), toCsv(results));
  writeFileSync(
    join(outDir, "report.html"),
    toHtml(results, { model, occLabel: occDisplay, runs: opts.runs, multiOcc }),
  );

  printSummary(results, model);
  console.log(`\n📄 Reporte: ${join(outDir, "report.html")}`);
  console.log(`   (abrilo en el navegador — tiene las fotos, verdicts y todas las categorías)\n`);
}

// ---- CSV: una fila por (imagen, corrida) ----
function toCsv(results: ImageResult[]): string {
  const catKeys = SCORE_CATEGORIES.map((c) => c.key);
  const header = [
    "file",
    "occasion",
    "run",
    "verdict",
    "analysisType",
    "overall",
    ...catKeys,
    "nivel",
    "val_ms",
    "score_ms",
    "error",
  ];
  const rows: string[] = [header.join(",")];
  for (const img of results) {
    for (const run of img.runs) {
      const catScore = (k: string) =>
        run.scoring?.categories.find((c) => c.key === k)?.score ?? "";
      rows.push(
        [
          csvCell(img.file),
          csvCell(img.occasionLabel),
          run.run,
          run.validation?.verdict ?? "",
          run.validation?.analysisType ?? "",
          run.overall ?? "",
          ...catKeys.map(catScore),
          csvCell(run.overall === null ? "" : scoreLevelLabel(spreadScore(run.overall))),
          run.validationMeta?.ms ?? "",
          run.scoringMeta?.ms ?? "",
          csvCell(run.error ?? ""),
        ].join(","),
      );
    }
  }
  return rows.join("\n");
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---- Resumen a stdout ----
function printSummary(results: ImageResult[], model: string) {
  const firstRuns = results.map((r) => r.runs[0]).filter(Boolean);
  const verdicts: Record<string, number> = {};
  const types: Record<string, number> = {};
  let overallSum = 0,
    overallN = 0,
    inTok = 0,
    outTok = 0,
    errors = 0;

  for (const img of results) {
    for (const run of img.runs) {
      if (run.error) errors++;
      if (run.validation) {
        verdicts[run.validation.verdict] = (verdicts[run.validation.verdict] ?? 0) + 1;
        const t = run.validation.analysisType ?? "—";
        types[t] = (types[t] ?? 0) + 1;
      }
      if (run.overall != null) {
        overallSum += run.overall;
        overallN++;
      }
      inTok += (run.validationMeta?.inputTokens ?? 0) + (run.scoringMeta?.inputTokens ?? 0);
      outTok += (run.validationMeta?.outputTokens ?? 0) + (run.scoringMeta?.outputTokens ?? 0);
    }
  }

  const distinctImages = new Set(results.map((r) => r.file)).size;
  const distinctOccasions = new Set(results.map((r) => r.occasionId)).size;
  console.log("── Resumen ─────────────────────────────");
  console.log(`  imágenes: ${distinctImages}  ·  ocasiones: ${distinctOccasions}  ·  combinaciones foto×ocasión: ${results.length}`);
  console.log(`  corridas totales: ${firstRuns.length ? results.reduce((s, r) => s + r.runs.length, 0) : 0}  ·  errores: ${errors}`);
  console.log(`  verdicts: ${Object.entries(verdicts).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`  tipos:    ${Object.entries(types).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`  overall promedio: ${overallN ? (overallSum / overallN).toFixed(1) : "—"}`);
  console.log(`  tokens: ${inTok} in + ${outTok} out  (${model})`);

  // Varianza de scoring (solo si hay >1 corrida por imagen)
  const multi = results.filter((r) => r.runs.length > 1 && r.runs.every((x) => x.overall != null));
  if (multi.length) {
    const spreads = multi.map((img) => {
      const vals = img.runs.map((x) => x.overall as number);
      return Math.max(...vals) - Math.min(...vals);
    });
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    const maxSpread = Math.max(...spreads);
    console.log("── Varianza (misma foto, varias corridas) ──");
    console.log(`  spread overall promedio: ${avgSpread.toFixed(1)} pts  ·  peor caso: ${maxSpread} pts`);
    console.log(`  (cuanto más alto, menos consistente/confiable es el puntaje)`);
  }
}

// ---- JS de cliente para el etiquetado (👍/👎 por foto + nota) ----
// Dos modos, autodetectados:
//   - Servido por scripts/eval/serve.ts (http) → AUTOGUARDA a labels.json vía
//     POST /api/labels en cada cambio, y sirve las fotos por /img/<archivo>.
//   - Abierto como file:// → cae a localStorage + botón Descargar (borrador).
// Las etiquetas van por nombre de archivo, así sobreviven a regenerar el reporte.
// Escrito sin backticks ni ${...} para poder incrustarlo en el template de arriba.
const CLIENT_SCRIPT = `
(function(){
  var KEY='muza-eval-labels';
  var state={};
  var SERVER=false;
  var saveTimer=null;
  var cards=Array.prototype.slice.call(document.querySelectorAll('.card'));
  function get(f){return state[f]||(state[f]={validation:null,scoring:null,note:''});}
  function isLabeled(s){return !!s&&(s.validation||s.scoring||(s.note&&s.note.trim()));}
  function isBad(s){return !!s&&(s.validation==='bad'||s.scoring==='bad');}
  function setStatus(t){var el=document.getElementById('savestatus'); if(el) el.textContent=t;}
  function persist(){
    if(SERVER){
      if(saveTimer) clearTimeout(saveTimer);
      saveTimer=setTimeout(function(){
        fetch('/api/labels',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)})
          .then(function(r){ setStatus(r.ok?'guardado en labels.json ✓':'⚠ error al guardar'); })
          .catch(function(){ setStatus('⚠ error al guardar'); });
      },250);
    } else {
      localStorage.setItem(KEY,JSON.stringify(state));
    }
    updateCounts();
  }
  function hydrate(){
    cards.forEach(function(card){
      var f=card.getAttribute('data-key'); var s=state[f];
      card.querySelectorAll('.lg').forEach(function(lg){
        var dim=lg.getAttribute('data-dim');
        lg.querySelectorAll('button').forEach(function(b){
          b.classList.toggle('on', !!s && s[dim]===b.getAttribute('data-v'));
        });
      });
      var note=card.querySelector('.note'); if(note) note.value=(s&&s.note)||'';
    });
    updateCounts();
  }
  function updateCounts(){
    var lab=0,bad=0;
    Object.keys(state).forEach(function(f){ if(isLabeled(state[f]))lab++; if(isBad(state[f]))bad++; });
    document.getElementById('counts').textContent='etiquetadas '+lab+'/'+cards.length+' · 👎 '+bad;
  }
  function applyFilter(){
    var mode=document.getElementById('filter').value;
    cards.forEach(function(card){
      var s=state[card.getAttribute('data-key')];
      var show = mode==='all' || (mode==='unlabeled'&&!isLabeled(s)) || (mode==='bad'&&isBad(s));
      card.classList.toggle('hide', !show);
    });
  }
  cards.forEach(function(card){
    var f=card.getAttribute('data-key');
    card.querySelectorAll('.lg').forEach(function(lg){
      var dim=lg.getAttribute('data-dim');
      lg.querySelectorAll('button').forEach(function(b){
        b.addEventListener('click',function(){
          var v=b.getAttribute('data-v'); var st=get(f);
          st[dim]= st[dim]===v ? null : v;
          persist(); hydrate(); applyFilter();
        });
      });
    });
    var note=card.querySelector('.note');
    if(note) note.addEventListener('input',function(){get(f).note=note.value;persist();});
  });
  document.getElementById('filter').addEventListener('change',applyFilter);
  document.getElementById('download').addEventListener('click',function(){
    var blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='labels.json'; a.click(); URL.revokeObjectURL(a.href);
  });
  document.getElementById('import').addEventListener('change',function(e){
    var file=e.target.files[0]; if(!file) return;
    var r=new FileReader();
    r.onload=function(){ try{ var obj=JSON.parse(r.result);
      Object.keys(obj).forEach(function(k){state[k]=obj[k];}); persist(); hydrate(); applyFilter();
    }catch(err){ alert('JSON inválido: '+err.message); } };
    r.readAsText(file);
  });
  document.getElementById('clear').addEventListener('click',function(){
    if(confirm('¿Borrar TODAS las etiquetas? Esto también vacía labels.json si estás en modo servidor.')){ state={}; persist(); hydrate(); applyFilter(); }
  });
  // Autodetección de modo: si hay servidor, GET /api/labels responde ok.
  fetch('/api/labels').then(function(r){ if(!r.ok) throw 0; return r.json(); })
    .then(function(obj){
      SERVER=true; state=obj||{};
      // Sobre http las fotos file:// no cargan → las servimos por /img/<archivo>.
      cards.forEach(function(card){
        var f=card.getAttribute('data-file');
        var img=card.querySelector('img'); if(img) img.src='/img/'+encodeURIComponent(f);
        var a=card.querySelector('a'); if(a) a.href='/img/'+encodeURIComponent(f);
      });
      setStatus('autoguardado en labels.json');
      hydrate(); applyFilter();
    })
    .catch(function(){
      SERVER=false; state=JSON.parse(localStorage.getItem(KEY)||'{}');
      setStatus('modo local — acordate de Descargar');
      hydrate(); applyFilter();
    });
})();
`;

// ---- Reporte HTML autocontenido ----
function toHtml(
  results: ImageResult[],
  ctx: { model: string; occLabel: string; runs: number; multiOcc: boolean },
): string {
  const verdictColor: Record<string, string> = {
    valid: "#16a34a",
    partial: "#d97706",
    invalid: "#dc2626",
  };
  const bandColor = (s: number) => (s >= 75 ? "#16a34a" : s >= 60 ? "#d97706" : "#dc2626");

  const cards = results
    .map((img) => {
      const r0 = img.runs[0];
      const spread =
        img.runs.length > 1 && img.runs.every((x) => x.overall != null)
          ? Math.max(...img.runs.map((x) => x.overall as number)) -
            Math.min(...img.runs.map((x) => x.overall as number))
          : null;

      const runsHtml = img.runs
        .map((run) => {
          if (run.error) return `<div class="err">✖ ${esc(run.error)}</div>`;
          const v = run.validation;
          const badge = v
            ? `<span class="badge" style="background:${verdictColor[v.verdict]}">${v.verdict}${v.analysisType ? " · " + v.analysisType : ""}</span>`
            : "";
          const issues =
            v && v.issues.length ? `<div class="issues">⚠ ${v.issues.map(esc).join(" · ")}</div>` : "";
          const cats = run.scoring
            ? run.scoring.categories
                .map((c) => {
                  const label = SCORE_CATEGORIES.find((d) => d.key === c.key)?.label ?? c.key;
                  return `<div class="cat"><span class="cat-l">${esc(label)}</span>
                    <span class="bar"><i style="width:${c.score}%;background:${bandColor(c.score)}"></i></span>
                    <span class="cat-s">${c.score}</span></div>`;
                })
                .join("")
            : `<div class="muted">sin scoring (verdict invalid)</div>`;
          const overall =
            run.overall != null
              ? `<div class="overall" style="color:${bandColor(run.overall)}">${run.overall}</div>`
              : `<div class="overall muted">—</div>`;
          const lists = run.scoring
            ? `<div class="lists">
                 <div><b>Fortalezas</b><ul>${run.scoring.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
                 <div><b>A mejorar</b><ul>${run.scoring.improvements.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
                 <div><b>Recomendaciones</b><ul>${run.scoring.recommendations.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
               </div>`
            : "";
          return `<div class="run">
            <div class="run-head">${img.runs.length > 1 ? `<span class="rn">#${run.run}</span>` : ""}${badge}${overall}</div>
            ${issues}${cats}${lists}</div>`;
        })
        .join("");

      const scoringGroup = img.runs.some((r) => r.scoring != null)
        ? `<div class="lg" data-dim="scoring"><span>Score</span><button data-v="good">👍</button><button data-v="bad">👎</button></div>`
        : "";
      const occChip = ctx.multiOcc
        ? `<span class="occ">${esc(img.occasionLabel)}</span>`
        : "";
      return `<div class="card" data-file="${escAttr(img.file)}" data-key="${escAttr(img.labelKey)}">
        <a href="file://${escAttr(img.path)}" target="_blank"><img src="file://${escAttr(img.path)}" loading="lazy"/></a>
        <div class="body">
          <div class="fname">${occChip}${esc(img.file)}${spread != null ? ` <span class="spread" title="diferencia entre corridas">Δ${spread}</span>` : ""}</div>
          <div class="lblrow">
            <div class="lg" data-dim="validation"><span>Val</span><button data-v="good">👍</button><button data-v="bad">👎</button></div>
            ${scoringGroup}
            <input class="note" placeholder="nota…" />
          </div>
          ${runsHtml}
        </div>
      </div>`;
    })
    .join("\n");

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<title>Muza · eval IA</title>
<style>
  body{font:14px/1.4 system-ui,sans-serif;margin:0;background:#0b0b0f;color:#e7e7ea}
  header{position:sticky;top:0;background:#15151c;padding:14px 20px;border-bottom:1px solid #26262e;z-index:2}
  header b{color:#fff}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;padding:20px}
  .card{background:#15151c;border:1px solid #26262e;border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
  .card img{width:100%;height:280px;object-fit:cover;background:#000;display:block}
  .body{padding:12px 14px}
  .fname{font-weight:600;margin-bottom:8px;color:#fff;font-size:13px;word-break:break-all}
  .spread{background:#7c2d12;color:#fed7aa;padding:1px 6px;border-radius:6px;font-size:11px}
  .occ{background:#1e3a5f;color:#bfdbfe;padding:1px 7px;border-radius:6px;font-size:11px;margin-right:6px;font-weight:600}
  .run{border-top:1px solid #26262e;padding:10px 0}
  .run:first-child{border-top:0}
  .run-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .rn{color:#8a8a94;font-size:12px}
  .badge{color:#fff;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600}
  .overall{margin-left:auto;font-size:26px;font-weight:700}
  .issues{color:#fca5a5;font-size:12px;margin-bottom:6px}
  .err{color:#fca5a5}
  .muted{color:#6b6b74}
  .cat{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px}
  .cat-l{width:150px;color:#b6b6bd}
  .cat-s{width:26px;text-align:right;color:#e7e7ea}
  .bar{flex:1;height:7px;background:#26262e;border-radius:4px;overflow:hidden}
  .bar i{display:block;height:100%}
  .lists{display:grid;grid-template-columns:1fr;gap:4px;margin-top:8px;font-size:12px;color:#c9c9d0}
  .lists ul{margin:2px 0 6px;padding-left:16px}
  .lists b{color:#e7e7ea;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
  .lblrow{display:flex;align-items:center;gap:8px;margin:2px 0 10px;flex-wrap:wrap}
  .lg{display:flex;align-items:center;gap:3px}
  .lg>span{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#8a8a94;margin-right:2px}
  .lg button{background:#26262e;border:1px solid #33333d;color:#e7e7ea;border-radius:6px;padding:2px 7px;cursor:pointer;font-size:13px;line-height:1}
  .lg button.on[data-v=good]{background:#14532d;border-color:#16a34a}
  .lg button.on[data-v=bad]{background:#7f1d1d;border-color:#dc2626}
  .note{flex:1;min-width:90px;background:#0f0f14;border:1px solid #26262e;color:#e7e7ea;border-radius:6px;padding:3px 7px;font:12px system-ui}
  .toolbar{display:flex;align-items:center;gap:12px;margin-top:8px;font-size:13px;flex-wrap:wrap}
  .toolbar button,.toolbar label{background:#26262e;border:1px solid #33333d;color:#e7e7ea;border-radius:6px;padding:4px 10px;cursor:pointer}
  .toolbar .counts{background:none;border:0;padding:0;color:#b6b6bd}
  .toolbar select{background:#26262e;border:1px solid #33333d;color:#e7e7ea;border-radius:6px;padding:2px 6px;margin-left:4px}
  .savestatus{color:#6b6b74;font-size:12px}
  .card.hide{display:none}
</style></head><body>
<header>
  <div><b>Muza · eval IA</b> — ${new Set(results.map((r) => r.file)).size} imágenes${ctx.multiOcc ? ` × ${new Set(results.map((r) => r.occasionId)).size} ocasiones = ${results.length} tarjetas` : ""} · modelo <b>${esc(ctx.model)}</b> · ocasión <b>${esc(ctx.occLabel)}</b> · ${ctx.runs} corrida(s) c/u</div>
  <div class="toolbar">
    <span class="counts" id="counts"></span>
    <label>Ver<select id="filter"><option value="all">todas</option><option value="unlabeled">sin etiquetar</option><option value="bad">solo 👎</option></select></label>
    <button id="download">⬇ Descargar labels.json</button>
    <label>⬆ Importar<input id="import" type="file" accept="application/json" hidden/></label>
    <button id="clear">Borrar todo</button>
    <span class="savestatus" id="savestatus"></span>
  </div>
</header>
<div class="grid">${cards}</div>
<script>${CLIENT_SCRIPT}</script>
</body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}
function escAttr(s: string): string {
  return s.replace(/"/g, "%22");
}

main().catch((err) => {
  console.error("\n✖ Error fatal:", err);
  process.exit(1);
});
