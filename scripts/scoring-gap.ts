// ============================================================================
// LookLab — Medición del gap IA vs. comunidad (PR 1 del plan de scoring)
// ============================================================================
// Cruza el score que puso la IA (analyses.overall_score) contra el consenso de
// la comunidad que ya se recolecta en el VoteDeck (post_votes, en los 4 niveles
// de SCORE_LEVELS). Ambos ya conviven en community_feed_view: el score de la IA
// y los conteos de voto por nivel salen en la misma fila.
//
// El voto es una SEÑAL LIMPIA: el VoteDeck oculta el score de la IA mientras se
// vota ("adiviná el score"), así que la comunidad no se ancla al número de la IA.
// Es una segunda opinión independiente sobre el mismo outfit.
//
// Qué responde:
//   - ¿La IA coincide con la gente, o hay un sesgo sistemático (siempre alta /
//     siempre baja) en alguna ocasión?
//   - gap = communityScore - aiScore
//       gap > 0  → la comunidad puntúa MÁS ALTO que la IA (la IA sub-puntúa)
//       gap < 0  → la comunidad puntúa MÁS BAJO que la IA (la IA sobre-puntúa)
//
// SOLO LEE. No escribe nada. No gasta presupuesto de OpenAI.
//
// Uso:
//   npm run scoring:gap                 # umbral por defecto (>= 5 votos por post)
//   npm run scoring:gap -- --min 10     # más exigente con el consenso
//   npm run scoring:gap -- --json       # salida cruda para pipear
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (service role: bypassa RLS para leer todo)
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { emptyTally, communityScore, communityLevel } from "@/lib/community/constants";
import { scoreLevel } from "@/lib/scoring/categories";
import { occasionLabel } from "@/lib/occasions";
import type { OccasionId } from "@/types/domain";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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

// Media, desvío y correlación: lo mínimo para distinguir "sesgo sistemático" de
// "ruido centrado en cero".
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
// Pearson: ¿la IA y la comunidad se mueven juntas aunque haya un offset fijo?
// r alto + gap grande = la IA ordena bien pero está corrida (arreglable con
// calibración). r bajo = discrepan en el fondo, no solo en la escala.
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

// Una fila de community_feed_view, con lo que nos importa para el gap.
type FeedRow = {
  post_id: string;
  occasion_id: string;
  overall_score: number | null;
  votes_mejorar: number;
  votes_bien: number;
  votes_muy_bueno: number;
  votes_impecable: number;
};

type Point = {
  occasionId: string;
  ai: number;
  community: number;
  gap: number;
  totalVotes: number;
  levelMatch: boolean;
};

async function main() {
  const minVotes = Number(arg("min") ?? 5);
  const asJson = has("json");

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Traemos todo el feed. security_invoker=false + service role: vemos todos los
  // posts publicados sin pelear con RLS. Paginado por las dudas de que crezca.
  const rows: FeedRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("community_feed_view")
      .select(
        "post_id, occasion_id, overall_score, votes_mejorar, votes_bien, votes_muy_bueno, votes_impecable",
      )
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("Error leyendo community_feed_view:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as FeedRow[]));
    if (data.length < PAGE) break;
  }

  // Cada post → punto (ai, community, gap), si supera el umbral de votos y tiene
  // score de IA. Reusamos communityScore/communityLevel: la MISMA lógica que ve
  // el usuario en el reveal, no una copia.
  const points: Point[] = [];
  let skippedNoScore = 0;
  let skippedFewVotes = 0;

  for (const r of rows) {
    if (r.overall_score == null) {
      skippedNoScore++;
      continue;
    }
    const tally = emptyTally();
    tally.mejorar = r.votes_mejorar ?? 0;
    tally.bien = r.votes_bien ?? 0;
    tally.muy_bueno = r.votes_muy_bueno ?? 0;
    tally.impecable = r.votes_impecable ?? 0;
    const totalVotes = tally.mejorar + tally.bien + tally.muy_bueno + tally.impecable;
    if (totalVotes < minVotes) {
      skippedFewVotes++;
      continue;
    }
    const community = communityScore(tally);
    const communityLvl = communityLevel(tally);
    if (community == null || communityLvl == null) continue;

    points.push({
      occasionId: r.occasion_id,
      ai: r.overall_score,
      community,
      gap: community - r.overall_score,
      totalVotes,
      levelMatch: scoreLevel(r.overall_score) === communityLvl,
    });
  }

  if (points.length === 0) {
    console.error(
      `\nSin datos suficientes: ningún post con >= ${minVotes} votos y score de IA.\n` +
        `Probá bajar el umbral: npm run scoring:gap -- --min 3\n`,
    );
    process.exit(1);
  }

  // Agregados globales.
  const gaps = points.map((p) => p.gap);
  const global = {
    posts: points.length,
    minVotes,
    meanGap: mean(gaps),
    meanAbsGap: mean(gaps.map(Math.abs)),
    stdevGap: stdev(gaps),
    pearson: pearson(points.map((p) => p.ai), points.map((p) => p.community)),
    levelMatchRate: points.filter((p) => p.levelMatch).length / points.length,
    skippedNoScore,
    skippedFewVotes,
  };

  // Por ocasión: acá aparece el sesgo localizado (ej. "la IA sub-puntúa Fiesta").
  const byOccasion = new Map<string, Point[]>();
  for (const p of points) {
    const list = byOccasion.get(p.occasionId) ?? [];
    list.push(p);
    byOccasion.set(p.occasionId, list);
  }
  const occasions = [...byOccasion.entries()]
    .map(([id, ps]) => ({
      occasionId: id,
      label: occasionLabel(id as OccasionId),
      posts: ps.length,
      meanGap: mean(ps.map((p) => p.gap)),
      meanAbsGap: mean(ps.map((p) => Math.abs(p.gap))),
      levelMatchRate: ps.filter((p) => p.levelMatch).length / ps.length,
    }))
    .sort((a, b) => b.posts - a.posts);

  if (asJson) {
    console.log(JSON.stringify({ global, occasions }, null, 2));
    return;
  }

  // Salida legible.
  const n1 = (x: number) => (x >= 0 ? "+" : "") + x.toFixed(1);
  const pct = (x: number) => (x * 100).toFixed(0) + "%";

  console.log(`\n═══ Gap IA vs. comunidad ═══`);
  console.log(`Posts analizados: ${global.posts}  (umbral: >= ${minVotes} votos)`);
  console.log(`Descartados: ${global.skippedFewVotes} por pocos votos, ${global.skippedNoScore} sin score de IA\n`);

  console.log(`Gap medio:        ${n1(global.meanGap)} pts   ${direction(global.meanGap)}`);
  console.log(`Gap medio |abs|:  ${global.meanAbsGap.toFixed(1)} pts   (cuánto discrepan, sin importar el signo)`);
  console.log(`Desvío del gap:   ${global.stdevGap.toFixed(1)} pts   (${global.stdevGap > Math.abs(global.meanGap) * 1.5 ? "domina el RUIDO: gap centrado en ~0" : "el sesgo supera al ruido: es SISTEMÁTICO"})`);
  console.log(`Correlación (r):  ${global.pearson.toFixed(2)}       (${corrReading(global.pearson)})`);
  console.log(`Coincide el nivel: ${pct(global.levelMatchRate)}   (IA y comunidad caen en la misma banda de color)\n`);

  console.log(`Por ocasión (ordenado por volumen):`);
  console.log(`  ${"Ocasión".padEnd(14)} ${"posts".padStart(5)}  ${"gap".padStart(6)}  ${"|gap|".padStart(6)}  ${"nivel=".padStart(6)}`);
  for (const o of occasions) {
    console.log(
      `  ${o.label.padEnd(14)} ${String(o.posts).padStart(5)}  ${n1(o.meanGap).padStart(6)}  ${o.meanAbsGap.toFixed(1).padStart(6)}  ${pct(o.levelMatchRate).padStart(6)}`,
    );
  }

  console.log(`\n─── Cómo leerlo ───`);
  console.log(verdict(global));
  console.log();
}

function direction(gap: number): string {
  if (Math.abs(gap) < 1.5) return "(la IA y la gente coinciden)";
  return gap > 0 ? "(la comunidad puntúa MÁS ALTO: la IA sub-puntúa)" : "(la comunidad puntúa MÁS BAJO: la IA sobre-puntúa)";
}

function corrReading(r: number): string {
  if (r >= 0.6) return "ordenan parecido; un gap grande sería offset arreglable con calibración";
  if (r >= 0.3) return "acuerdo parcial";
  return "discrepan en el fondo, no solo en la escala";
}

function verdict(g: { meanGap: number; meanAbsGap: number; stdevGap: number; levelMatchRate: number }): string {
  const systematic = g.stdevGap <= Math.abs(g.meanGap) * 1.5;
  if (g.meanAbsGap < 4 && g.levelMatchRate > 0.6) {
    return "→ La IA ya coincide con la comunidad. NO conviene tocar el motor: invertí el esfuerzo en otra cosa.";
  }
  if (systematic) {
    return "→ Hay un SESGO SISTEMÁTICO. Vale la pena el PR 2 (auto-curar ejemplos few-shot desde los outfits mejor votados) y mirar el desglose por ocasión para saber dónde corregir.";
  }
  return "→ Discrepan pero el gap está centrado en ~0 (ruido, no sesgo). Few-shot no lo va a mover parejo; revisá primero si el umbral de votos es muy bajo (subí --min).";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
