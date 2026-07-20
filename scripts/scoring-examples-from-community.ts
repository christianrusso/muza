// ============================================================================
// LookLab — Auto-curación de ejemplos few-shot desde el consenso de la comunidad
// ============================================================================
// (PR 2 del plan de scoring — Opción B.)
//
// Toma outfits que la comunidad votó a ciegas en el VoteDeck y, cuando el
// consenso es CLARO, los carga en scoring_examples como referencia few-shot con
// el nivel que les puso la gente. Reemplaza al etiquetador humano: la señal ya no
// la produce una persona mirando fotos, sino los votos reales.
//
// Por qué sirve: la medición (npm run scoring:gap) mostró que la IA puntúa ~16
// pts por encima del consenso, parejo entre ocasiones. Mostrarle outfits reales
// con su nivel de comunidad ("esto la gente lo llama 'bien', no 'impecable'")
// baja su escala hacia ese consenso.
//
// SEGURO POR DEFECTO: sin --apply es dry-run (muestra el plan, no escribe nada).
// PRIVACIDAD: copia la foto del usuario (bucket privado outfit-photos) al bucket
// de referencia scoring-examples. Son outfits publicados voluntariamente a la
// comunidad. Se guarda procedencia (source_analysis_id / source_user_id) para
// poder purgarlos; account/delete limpia la copia si el usuario borra la cuenta.
//
// Uso:
//   npm run scoring:curate                          # dry-run, umbrales por defecto
//   npm run scoring:curate -- --min 8 --consensus 0.6
//   npm run scoring:curate -- --apply               # escribe de verdad
//   npm run scoring:curate -- --apply --replace     # borra las filas 'community' y recura
//
// Umbrales:
//   --min <n>         votos mínimos por post (default 6)
//   --consensus <f>   fracción del nivel dominante para aceptar (default 0.5)
//   --per-cell <n>    máx. ejemplos por (ocasión × nivel) (default 6)
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emptyTally, communityScore, communityLevel, type VoteBucket } from "@/lib/community/constants";
import { SCORE_LEVELS } from "@/lib/scoring/categories";
import { occasionLabel } from "@/lib/occasions";
import type { OccasionId } from "@/types/domain";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC_BUCKET = "outfit-photos"; // fotos de usuario (privado)
const DST_BUCKET = process.env.SCORING_EXAMPLES_BUCKET ?? "scoring-examples";

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

// impecable/muy_bueno → 'good', bien/mejorar → 'bad'. Solo para que el balanceador
// de getFewShotExamples (que reparte por verdict) siga funcionando; lo que ve el
// modelo es community_level.
function verdictForLevel(level: VoteBucket): "good" | "bad" {
  return level === "impecable" || level === "muy_bueno" ? "good" : "bad";
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type FeedRow = {
  post_id: string;
  analysis_id: string;
  author_id: string;
  photo_path: string;
  occasion_id: string;
  overall_score: number | null;
  votes_mejorar: number;
  votes_bien: number;
  votes_muy_bueno: number;
  votes_impecable: number;
};

type Candidate = {
  analysisId: string;
  userId: string;
  photoPath: string;
  occasionId: string;
  level: VoteBucket;
  score: number;
  votes: number;
  share: number; // fracción del nivel dominante
};

async function fetchFeed(supabase: SupabaseClient): Promise<FeedRow[]> {
  const rows: FeedRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("community_feed_view")
      .select(
        "post_id, analysis_id, author_id, photo_path, occasion_id, overall_score, votes_mejorar, votes_bien, votes_muy_bueno, votes_impecable",
      )
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`leyendo community_feed_view: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as FeedRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

async function main() {
  const apply = has("apply");
  const replace = has("replace");
  const minVotes = Number(arg("min") ?? 6);
  const minConsensus = Number(arg("consensus") ?? 0.5);
  const perCell = Number(arg("per-cell") ?? 6);

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1) Candidatos: posts con consenso claro.
  const rows = await fetchFeed(supabase);
  const candidates: Candidate[] = [];
  for (const r of rows) {
    const tally = emptyTally();
    tally.mejorar = r.votes_mejorar ?? 0;
    tally.bien = r.votes_bien ?? 0;
    tally.muy_bueno = r.votes_muy_bueno ?? 0;
    tally.impecable = r.votes_impecable ?? 0;
    const total = tally.mejorar + tally.bien + tally.muy_bueno + tally.impecable;
    if (total < minVotes) continue;

    const level = communityLevel(tally);
    const score = communityScore(tally);
    if (level == null || score == null) continue;

    // Consenso: qué fracción de los votos cayó en el nivel dominante. Bajo este
    // umbral el outfit está "dividido" y no enseña una calibración clara.
    const dominant = Math.max(tally.mejorar, tally.bien, tally.muy_bueno, tally.impecable);
    const share = dominant / total;
    if (share < minConsensus) continue;

    candidates.push({
      analysisId: r.analysis_id,
      userId: r.author_id,
      photoPath: r.photo_path,
      occasionId: r.occasion_id,
      level,
      score,
      votes: total,
      share,
    });
  }

  // 2) Balanceo por (ocasión × nivel): los mejores (más votos, más consenso)
  //    hasta perCell por celda. Evita inundar con la celda más popular.
  const byCell = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const cellKey = `${c.occasionId}|${c.level}`;
    const list = byCell.get(cellKey) ?? [];
    list.push(c);
    byCell.set(cellKey, list);
  }
  const picked: Candidate[] = [];
  for (const list of byCell.values()) {
    list.sort((a, b) => b.votes - a.votes || b.share - a.share);
    picked.push(...list.slice(0, perCell));
  }

  // 3) Saltear los ya curados (idempotencia por source_analysis_id).
  const { data: existing } = await supabase
    .from("scoring_examples")
    .select("source_analysis_id")
    .eq("source", "community");
  const already = new Set((existing ?? []).map((e) => e.source_analysis_id));
  const toInsert = replace ? picked : picked.filter((c) => !already.has(c.analysisId));

  // Reporte del plan.
  console.log(`\n═══ Curación de ejemplos desde la comunidad ═══`);
  console.log(`Umbrales: >= ${minVotes} votos, consenso >= ${(minConsensus * 100).toFixed(0)}%, máx ${perCell}/celda`);
  console.log(`Candidatos con consenso: ${candidates.length}  →  seleccionados: ${picked.length}  →  a insertar: ${toInsert.length}`);
  if (!replace && already.size) console.log(`(${picked.length - toInsert.length} ya estaban curados, se saltean)`);

  // Desglose por ocasión × nivel.
  const grid = new Map<string, Map<VoteBucket, number>>();
  for (const c of toInsert) {
    const row = grid.get(c.occasionId) ?? new Map<VoteBucket, number>();
    row.set(c.level, (row.get(c.level) ?? 0) + 1);
    grid.set(c.occasionId, row);
  }
  console.log(`\n  ${"Ocasión".padEnd(14)} ${SCORE_LEVELS.map((l) => l.label.slice(0, 9).padStart(9)).join(" ")}`);
  for (const [occ, row] of grid) {
    const cells = SCORE_LEVELS.map((l) => String(row.get(l.level) ?? 0).padStart(9)).join(" ");
    console.log(`  ${occasionLabel(occ as OccasionId).padEnd(14)} ${cells}`);
  }

  if (!apply) {
    console.log(`\n(dry-run) No se escribió nada. Corré con --apply para aplicar.\n`);
    return;
  }

  // 4) Aplicar. Asegurar el bucket (lo crea el service role; ver 0011). Sin esto
  //    las subidas fallan con "Bucket not found" si nunca se pobló el banco.
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === DST_BUCKET)) {
    const { error } = await supabase.storage.createBucket(DST_BUCKET, { public: false });
    if (error) {
      console.error(`✖ No se pudo crear el bucket ${DST_BUCKET}: ${error.message}`);
      process.exit(1);
    }
    console.log(`✔ bucket ${DST_BUCKET} creado`);
  }

  // Opcional: limpiar antes las filas 'community' y sus fotos.
  if (replace) {
    console.log(`\n--replace: borrando filas 'community' previas…`);
    const { data: old } = await supabase
      .from("scoring_examples")
      .select("photo_path")
      .eq("source", "community");
    if (old?.length) {
      await supabase.storage.from(DST_BUCKET).remove(old.map((o) => o.photo_path));
    }
    await supabase.from("scoring_examples").delete().eq("source", "community");
  }

  console.log(`\nAplicando ${toInsert.length} ejemplos…`);
  let ok = 0;
  let failed = 0;
  for (const c of toInsert) {
    // Copiar la foto: descargar de outfit-photos, subir a scoring-examples.
    const { data: blob, error: dlErr } = await supabase.storage.from(SRC_BUCKET).download(c.photoPath);
    if (dlErr || !blob) {
      console.warn(`  ✗ ${c.analysisId}: no se pudo descargar (${dlErr?.message ?? "sin blob"})`);
      failed++;
      continue;
    }
    const ext = extname(c.photoPath).toLowerCase() || ".jpg";
    const dstKey = `community/${c.analysisId}${ext}`;
    const { error: upErr } = await supabase.storage
      .from(DST_BUCKET)
      .upload(dstKey, blob, { contentType: MIME[ext] ?? "image/jpeg", upsert: true });
    if (upErr) {
      console.warn(`  ✗ ${c.analysisId}: no se pudo subir (${upErr.message})`);
      failed++;
      continue;
    }

    const { error: insErr } = await supabase.from("scoring_examples").insert({
      photo_path: dstKey,
      occasion_id: c.occasionId,
      verdict: verdictForLevel(c.level),
      note: null,
      active: true,
      source: "community",
      community_level: c.level,
      community_score: c.score,
      vote_count: c.votes,
      source_analysis_id: c.analysisId,
      source_user_id: c.userId,
    });
    if (insErr) {
      console.warn(`  ✗ ${c.analysisId}: no se pudo insertar (${insErr.message})`);
      failed++;
      continue;
    }
    ok++;
  }

  console.log(`\n✓ Insertados: ${ok}   ✗ Fallidos: ${failed}`);
  console.log(`\nRecordá prender el flag para que se usen:  SCORING_FEWSHOT_ENABLED=true\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
