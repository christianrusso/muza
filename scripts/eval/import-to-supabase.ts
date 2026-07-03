// ============================================================================
// Muza — Import del banco de few-shot a Supabase (producción)
// ============================================================================
// Toma tu ground truth local (labels.json + fotos) y lo sube a Supabase para que
// la app real lo use como banco de ejemplos. NO corre en prod: se corre a mano
// cuando querés poblar o actualizar el banco.
//
// Sube: cada foto etiquetada → storage (bucket "scoring-examples"), y una fila
// por (foto, ocasión) → tabla scoring_examples.
//
// SEGURO POR DEFECTO: sin --apply solo muestra qué haría (dry-run), no escribe.
//
// Uso:
//   npm run eval:import -- --dir test-photos                 # dry-run (ver el plan)
//   npm run eval:import -- --dir test-photos --apply         # escribe de verdad
//   npm run eval:import -- --dir test-photos --apply --replace   # reemplaza el banco entero
//   npm run eval:import -- --dir test-photos --holdout-file scripts/eval/holdout.txt --apply
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (service role: bypassa RLS para insertar/subir)
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { OCCASIONS } from "@/lib/occasions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const LABELS_FILE = join(__dirname, "labels.json");
const BUCKET = process.env.SCORING_EXAMPLES_BUCKET ?? "scoring-examples";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function loadEnv(): Record<string, string> {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

// clave de storage estable a partir de la ruta relativa (sin espacios)
const storageKey = (relFile: string) => `examples/${relFile.replace(/\s+/g, "_")}`;

// rótulo de ocasión ("Casual") → id ("casual")
const LABEL_TO_ID = new Map(OCCASIONS.map((o) => [o.label, o.id] as const));

async function main() {
  const dir = arg("dir") ?? "test-photos";
  const apply = has("apply");
  const replace = has("replace");
  const holdoutFile = arg("holdout-file");
  const imgDir = resolve(dir);

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Las credenciales solo hacen falta para escribir; el dry-run corre sin ellas.

  // holdout: fotos que NO van al banco (para medir sin data leakage)
  const holdout = new Set<string>();
  if (holdoutFile && existsSync(holdoutFile)) {
    for (const l of readFileSync(holdoutFile, "utf8").split("\n")) {
      const t = l.trim();
      if (t) holdout.add(t);
    }
  }

  const labels: Record<string, { scoring?: string | null; note?: string }> = JSON.parse(
    readFileSync(LABELS_FILE, "utf8"),
  );

  // armar: fotos únicas a subir + filas a insertar
  const photos = new Map<string, string>(); // relFile -> storageKey
  const rows: { photo_path: string; occasion_id: string; verdict: "good" | "bad"; note: string | null }[] = [];
  const skipped: string[] = [];

  for (const [k, v] of Object.entries(labels)) {
    if (!k.includes(" · ")) continue;
    if (v.scoring !== "good" && v.scoring !== "bad") continue;
    const sep = k.lastIndexOf(" · ");
    const relFile = k.slice(0, sep);
    const occLabel = k.slice(sep + 3);
    if (holdout.has(relFile)) {
      skipped.push(`${relFile} (holdout)`);
      continue;
    }
    const occId = LABEL_TO_ID.get(occLabel);
    if (!occId) {
      skipped.push(`${k} (ocasión desconocida: ${occLabel})`);
      continue;
    }
    if (!existsSync(join(imgDir, relFile))) {
      skipped.push(`${k} (foto no encontrada en ${dir})`);
      continue;
    }
    const path = storageKey(relFile);
    photos.set(relFile, path);
    rows.push({ photo_path: path, occasion_id: occId, verdict: v.scoring, note: v.note?.trim() || null });
  }

  console.log(`\n📦 Plan de import (${apply ? "APLICAR" : "DRY-RUN"})`);
  console.log(`   bucket: ${BUCKET} · carpeta: ${dir}`);
  console.log(`   fotos a subir: ${photos.size}`);
  console.log(`   filas a insertar: ${rows.length}`);
  if (holdout.size) console.log(`   holdout (excluidas): ${holdout.size}`);
  if (skipped.length) {
    console.log(`   saltadas: ${skipped.length}`);
    for (const s of skipped.slice(0, 10)) console.log(`     · ${s}`);
    if (skipped.length > 10) console.log(`     … y ${skipped.length - 10} más`);
  }
  // balance por ocasión
  const bal: Record<string, { g: number; b: number }> = {};
  for (const r of rows) {
    bal[r.occasion_id] = bal[r.occasion_id] ?? { g: 0, b: 0 };
    r.verdict === "good" ? bal[r.occasion_id].g++ : bal[r.occasion_id].b++;
  }
  console.log(`   balance por ocasión (👍/👎):`);
  for (const [o, c] of Object.entries(bal).sort()) console.log(`     ${o.padEnd(11)} 👍${c.g} 👎${c.b}`);

  if (!apply) {
    console.log(`\n(dry-run: no se escribió nada. Agregá --apply para ejecutar.)\n`);
    return;
  }

  if (!url || !key) {
    console.error("\n✖ Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local (necesarias para --apply)");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1) asegurar bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error) {
      console.error(`✖ No se pudo crear el bucket ${BUCKET}: ${error.message}`);
      process.exit(1);
    }
    console.log(`✔ bucket ${BUCKET} creado`);
  }

  // 2) reemplazar banco si corresponde
  if (replace) {
    const { error } = await supabase.from("scoring_examples").delete().gt("created_at", "1970-01-01");
    if (error) console.error(`⚠ no se pudo limpiar el banco: ${error.message}`);
    else console.log(`✔ banco anterior borrado (--replace)`);
  }

  // 3) subir fotos
  let up = 0;
  for (const [relFile, path] of photos) {
    const buf = readFileSync(join(imgDir, relFile));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buf, { upsert: true, contentType: MIME[extname(relFile).toLowerCase()] ?? "image/jpeg" });
    if (error) console.error(`⚠ falló subir ${relFile}: ${error.message}`);
    else up++;
    process.stdout.write(`\r   subidas ${up}/${photos.size}`);
  }
  console.log("");

  // 4) insertar filas
  const { error: insErr } = await supabase.from("scoring_examples").insert(rows);
  if (insErr) {
    console.error(`✖ falló insertar filas: ${insErr.message}`);
    process.exit(1);
  }

  console.log(`\n✔ Import listo: ${up} fotos subidas · ${rows.length} filas insertadas en scoring_examples.`);
  console.log(`   Para activar el few-shot en prod: seteá SCORING_FEWSHOT_ENABLED=true.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
