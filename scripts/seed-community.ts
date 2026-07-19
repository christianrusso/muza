// ============================================================================
// LookLab — Seed de comunidad (cuentas + posts sembrados)
// ============================================================================
// Puebla la comunidad para el lanzamiento: por cada foto en seed-fotos/<ocasión>/
// crea un usuario semilla, sube la foto, corre el SCORING REAL (mismo modelo y
// prompt que la app) y publica el post. Suma una capa liviana de follows / likes /
// comentarios / votos ENTRE las cuentas semilla (nunca sobre usuarios reales) para
// que la comunidad no arranque en cero.
//
// SEGURO POR DEFECTO: sin --apply solo muestra el plan (dry-run), no escribe nada
// ni gasta OpenAI.
//
// Uso:
//   npm run seed:community                 # dry-run (ver el plan)
//   npm run seed:community -- --apply       # crea todo de verdad (gasta OpenAI)
//   npm run seed:community -- --clean --apply   # borra TODAS las cuentas semilla
//   npm run seed:community -- --dir seed-fotos   # carpeta de fotos (default)
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (service role: bypassa RLS)
//   OPENAI_API_KEY              (para el scoring)
//   OPENAI_VISION_MODEL         (opcional; default gpt-4o)
//
// Nomenclatura de fotos:  seed-fotos/<ocasión>/<f|m>-XX.<jpg|png|webp>
//   carpeta -> ocasión · prefijo f/m -> género.
// ============================================================================

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { buildScoringPrompt } from "@/lib/ai/prompts/scoring.prompt";
import { ScoringResultSchema, type ScoringResult } from "@/lib/ai/schema";
import { computeOverallScore, applicableCategories, SCORE_CATEGORIES } from "@/lib/scoring/categories";
import { occasionLabel } from "@/lib/occasions";
import type { OccasionId, UserGender } from "@/types/domain";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const BUCKET = "outfit-photos";
const SEED_EMAIL_DOMAIN = "looklab.seed"; // marca para identificar/limpiar cuentas semilla
const ANALYSIS_TYPE = "completo" as const; // todas las fotos son de cuerpo entero
const SPREAD_DAYS = 25; // repartimos las fechas de posteo en los últimos N días

// carpeta (español) -> id de ocasión (el que usa la app)
const FOLDER_TO_OCCASION: Record<string, OccasionId> = {
  casual: "casual",
  trabajo: "work",
  gimnasio: "gym",
  fiesta: "party",
  cita: "date",
  casamiento: "wedding",
  entrevista: "interview",
  viaje: "travel",
};

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const FIRST_F = ["Martina", "Valentina", "Sofía", "Camila", "Julieta", "Lucía", "Micaela", "Agustina", "Carla", "Florencia", "Rocío", "Brenda", "Paula", "Daniela", "Antonella", "Belén", "Milagros", "Carolina"];
const FIRST_M = ["Tomás", "Mateo", "Juan", "Facundo", "Lucas", "Nicolás", "Santiago", "Franco", "Bruno", "Ignacio", "Matías", "Joaquín", "Gonzalo", "Lautaro", "Ramiro", "Diego", "Pablo", "Emiliano"];
const LAST_INITIAL = ["R.", "L.", "G.", "M.", "S.", "P.", "F.", "D.", "C.", "B.", "V.", "A."];

const CAPTIONS = [null, null, null, "¿Aprueban? 👀", "Mi look de hoy", "A ver qué dicen 🙏", "Nuevo fit", "Para la ocasión 🔥", "¿Le pego o no?", "Opinen 🙌", null];
const COMMENTS = ["Buenísimo 🔥", "Me encanta", "Team este look", "Combina todo", "Groso/a", "Divino/a 😍", "Le doy un 9", "Zafa jaja", "Le cambiaría el calzado", "No me convence del todo", "Buenísima elección", "Impecable"];

// ---- utils ----
function loadEnv(): Record<string, string> {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[m[1]] = val;
  }
  return env;
}
const has = (name: string) => process.argv.includes(`--${name}`);
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
function shuffle<T>(a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// timestamp aleatorio dentro de los últimos SPREAD_DAYS
const staggeredDate = () => new Date(Date.now() - randInt(1, SPREAD_DAYS) * 86400_000 - randInt(0, 82800) * 1000).toISOString();
const bucketForScore = (s: number) => (s < 25 ? "low" : s > 75 ? "high" : "mid");

interface SeedPhoto { absPath: string; fileName: string; occasionId: OccasionId; gender: UserGender; }

function gatherPhotos(dir: string): SeedPhoto[] {
  const out: SeedPhoto[] = [];
  for (const [folder, occasionId] of Object.entries(FOLDER_TO_OCCASION)) {
    const folderPath = join(dir, folder);
    if (!existsSync(folderPath)) continue;
    for (const f of readdirSync(folderPath).sort()) {
      const ext = extname(f).toLowerCase();
      if (!MIME[ext]) continue;
      const prefix = f[0]?.toLowerCase();
      if (prefix !== "f" && prefix !== "m") continue;
      out.push({ absPath: join(folderPath, f), fileName: f, occasionId, gender: prefix === "f" ? "femenino" : "masculino" });
    }
  }
  return out;
}

function makeSupabase(): SupabaseClient {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local"); process.exit(1); }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ---- limpieza ----
async function clean(supabase: SupabaseClient) {
  console.log(`\n🧹 Limpiando cuentas semilla (@${SEED_EMAIL_DOMAIN})…`);
  let page = 1, removed = 0;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error(error.message); break; }
    const seed = data.users.filter((u) => (u.email ?? "").endsWith(`@${SEED_EMAIL_DOMAIN}`));
    for (const u of seed) {
      // storage no está en el cascade de la DB: borrar la carpeta del usuario a mano
      const { data: files } = await supabase.storage.from(BUCKET).list(u.id);
      if (files?.length) await supabase.storage.from(BUCKET).remove(files.map((f) => `${u.id}/${f.name}`));
      await supabase.auth.admin.deleteUser(u.id); // cascade borra profile/analyses/posts/etc.
      removed++;
      process.stdout.write(`\r   borradas ${removed}`);
    }
    if (data.users.length < 200) break;
    page++;
  }
  console.log(`\n✔ Listo: ${removed} cuentas semilla eliminadas.\n`);
}

// ---- una foto -> usuario + análisis + post ----
async function seedOne(
  supabase: SupabaseClient,
  openai: OpenAI,
  model: string,
  photo: SeedPhoto,
  name: string,
  idx: number,
): Promise<{ userId: string; postId: string; gender: UserGender; overall: number } | null> {
  const email = `seed-${idx}-${randomUUID().slice(0, 8)}@${SEED_EMAIL_DOMAIN}`;
  // 1) usuario de auth (el trigger crea el profile con full_name del metadata)
  const { data: created, error: userErr } = await supabase.auth.admin.createUser({
    email, password: randomUUID(), email_confirm: true, user_metadata: { full_name: name },
  });
  if (userErr || !created.user) { console.error(`\n✖ ${photo.fileName}: no se pudo crear usuario: ${userErr?.message}`); return null; }
  const userId = created.user.id;
  await supabase.from("profiles").update({ full_name: name, gender: photo.gender }).eq("id", userId);

  // 2) subir foto
  const buf = readFileSync(photo.absPath);
  const ext = extname(photo.fileName).toLowerCase();
  const contentType = MIME[ext] ?? "image/jpeg";
  const photoPath = `${userId}/${randomUUID()}${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(photoPath, buf, { contentType });
  if (upErr) { console.error(`\n✖ ${photo.fileName}: falló subir foto: ${upErr.message}`); return null; }

  // 3) scoring real (imagen como data URL, igual que el eval)
  const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
  const occLabel = occasionLabel(photo.occasionId);
  let result: ScoringResult;
  try {
    const response = await openai.responses.parse({
      model,
      temperature: 0,
      input: [
        { role: "system", content: buildScoringPrompt({ occasionLabel: occLabel, analysisType: ANALYSIS_TYPE, userGender: photo.gender }) },
        { role: "user", content: [{ type: "input_text", text: "Analizá y puntuá este outfit." }, { type: "input_image", image_url: dataUrl, detail: "high" }] },
      ],
      text: { format: zodTextFormat(ScoringResultSchema, "scoring_result") },
    });
    if (!response.output_parsed) throw new Error("sin output_parsed");
    result = response.output_parsed;
  } catch (e) {
    console.error(`\n✖ ${photo.fileName}: falló el scoring: ${e instanceof Error ? e.message : e}`);
    return null;
  }

  const overall = computeOverallScore(result.categories, ANALYSIS_TYPE);
  const analysisDate = staggeredDate();

  // 4) insertar análisis + categorías + feedback (igual que la ruta /score)
  const { data: analysis, error: aErr } = await supabase.from("analyses").insert({
    user_id: userId,
    occasion_id: photo.occasionId,
    photo_path: photoPath,
    analysis_type: ANALYSIS_TYPE,
    validity_status: "valid",
    overall_score: overall,
    style_descriptors: result.styleDescriptors,
    detected_prendas_superiores: result.detected.prendasSuperiores,
    detected_prendas_inferiores: result.detected.prendasInferiores,
    detected_calzado: result.detected.calzado,
    detected_accesorios: result.detected.accesorios,
    detected_colores: result.detected.colores,
    detected_estilo: result.detected.estilo,
    ai_raw_response: result,
    created_at: analysisDate,
  }).select("id").single();
  if (aErr || !analysis) { console.error(`\n✖ ${photo.fileName}: falló insertar análisis: ${aErr?.message}`); return null; }
  const analysisId = analysis.id;

  await supabase.from("analysis_categories").insert(
    applicableCategories(result.categories, ANALYSIS_TYPE).map((c) => ({
      analysis_id: analysisId,
      category_key: c.key,
      weight: SCORE_CATEGORIES.find((d) => d.key === c.key)?.weight ?? 0,
      score: c.score,
      justification: c.justification,
    })),
  );
  await supabase.from("analysis_feedback").insert([
    ...result.strengths.map((text, i) => ({ analysis_id: analysisId, kind: "fortaleza", text, sort_order: i })),
    ...result.improvements.map((text, i) => ({ analysis_id: analysisId, kind: "aspecto_mejorar", text, sort_order: i })),
    ...result.recommendations.map((text, i) => ({ analysis_id: analysisId, kind: "recomendacion", text, sort_order: i })),
  ]);

  // 5) publicar (posted_at = created_at, un toque después del análisis)
  const postDate = new Date(new Date(analysisDate).getTime() + randInt(1, 120) * 60_000).toISOString();
  const { data: post, error: pErr } = await supabase.from("community_posts")
    .insert({ user_id: userId, analysis_id: analysisId, caption: pick(CAPTIONS), created_at: postDate })
    .select("id").single();
  if (pErr || !post) { console.error(`\n✖ ${photo.fileName}: falló publicar: ${pErr?.message}`); return null; }

  return { userId, postId: post.id, gender: photo.gender, overall };
}

// ---- capa de engagement entre semillas ----
async function seedEngagement(
  supabase: SupabaseClient,
  posts: { userId: string; postId: string; gender: UserGender; overall: number }[],
) {
  const userIds = posts.map((p) => p.userId);

  // follows: cada usuario sigue a 1-6 otros al azar
  const follows: { follower_id: string; following_id: string; created_at: string }[] = [];
  const seen = new Set<string>();
  for (const follower of userIds) {
    const others = shuffle(userIds.filter((u) => u !== follower)).slice(0, randInt(1, 6));
    for (const following of others) {
      const key = `${follower}|${following}`;
      if (seen.has(key)) continue;
      seen.add(key);
      follows.push({ follower_id: follower, following_id: following, created_at: staggeredDate() });
    }
  }
  if (follows.length) await supabase.from("follows").insert(follows);

  // likes, comentarios y votos por post (de otras semillas)
  const likes: { post_id: string; user_id: string; reaction: string; created_at: string }[] = [];
  const comments: { post_id: string; user_id: string; body: string; created_at: string }[] = [];
  const votes: { post_id: string; user_id: string; bucket: string; created_at: string }[] = [];
  for (const p of posts) {
    const voters = shuffle(userIds.filter((u) => u !== p.userId));
    // likes: 0-9
    for (const u of voters.slice(0, randInt(0, 9))) likes.push({ post_id: p.postId, user_id: u, reaction: "like", created_at: staggeredDate() });
    // comentarios: ~25% de los posts reciben 1-2
    if (Math.random() < 0.25) for (const u of voters.slice(0, randInt(1, 2))) comments.push({ post_id: p.postId, user_id: u, body: pick(COMMENTS), created_at: staggeredDate() });
    // votos: 4-10 votantes, sesgados hacia la franja real del score (con ruido)
    const truth = bucketForScore(p.overall);
    for (const u of voters.slice(0, randInt(4, 10))) {
      const b = Math.random() < 0.7 ? truth : pick(["low", "mid", "high"]);
      votes.push({ post_id: p.postId, user_id: u, bucket: b, created_at: staggeredDate() });
    }
  }
  if (likes.length) await supabase.from("post_reactions").insert(likes);
  if (comments.length) await supabase.from("post_comments").insert(comments);
  if (votes.length) await supabase.from("post_votes").insert(votes);

  return { follows: follows.length, likes: likes.length, comments: comments.length, votes: votes.length };
}

async function main() {
  const apply = has("apply");
  const dir = resolve(arg("dir") ?? "seed-fotos");

  if (has("clean")) {
    if (!apply) { console.log("\n(dry-run: --clean sin --apply no borra nada. Agregá --apply para ejecutar.)\n"); return; }
    await clean(makeSupabase());
    return;
  }

  const photos = gatherPhotos(dir);
  const byOcc: Record<string, { f: number; m: number }> = {};
  for (const p of photos) { byOcc[p.occasionId] = byOcc[p.occasionId] ?? { f: 0, m: 0 }; p.gender === "femenino" ? byOcc[p.occasionId].f++ : byOcc[p.occasionId].m++; }

  console.log(`\n🌱 Seed de comunidad (${apply ? "APLICAR" : "DRY-RUN"})`);
  console.log(`   carpeta: ${dir}`);
  console.log(`   fotos encontradas: ${photos.length}`);
  for (const [occ, c] of Object.entries(byOcc).sort()) console.log(`     ${occ.padEnd(11)} f:${c.f} m:${c.m}`);
  console.log(`   se crearán: ${photos.length} usuarios · ${photos.length} análisis (scoring real) · ${photos.length} posts + follows/likes/votos entre ellos.`);

  if (!apply) { console.log(`\n(dry-run: no se tocó nada ni se gastó OpenAI. Agregá --apply para ejecutar.)\n`); return; }
  if (photos.length === 0) { console.error("✖ No hay fotos para sembrar."); process.exit(1); }

  const env = loadEnv();
  const openaiKey = env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!openaiKey) { console.error("✖ Falta OPENAI_API_KEY en .env.local"); process.exit(1); }
  const model = env.OPENAI_VISION_MODEL ?? process.env.OPENAI_VISION_MODEL ?? "gpt-4o";
  const supabase = makeSupabase();
  const openai = new OpenAI({ apiKey: openaiKey });

  // bucket
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) { console.error(`✖ No existe el bucket ${BUCKET}.`); process.exit(1); }

  // nombres únicos por género
  const usedNames = new Set<string>();
  const nameFor = (g: UserGender) => {
    const firsts = g === "femenino" ? FIRST_F : FIRST_M;
    for (let t = 0; t < 200; t++) { const n = `${pick(firsts)} ${pick(LAST_INITIAL)}`; if (!usedNames.has(n)) { usedNames.add(n); return n; } }
    return `${pick(firsts)} ${pick(LAST_INITIAL)}${usedNames.size}`;
  };

  const done: { userId: string; postId: string; gender: UserGender; overall: number }[] = [];
  let i = 0;
  for (const photo of photos) {
    i++;
    process.stdout.write(`\r   procesando ${i}/${photos.length} (${photo.occasionId})…                `);
    const r = await seedOne(supabase, openai, model, photo, nameFor(photo.gender), i);
    if (r) done.push(r);
  }
  console.log(`\n   ✔ ${done.length}/${photos.length} posts creados.`);

  process.stdout.write("   sembrando follows / likes / comentarios / votos…");
  const eng = await seedEngagement(supabase, done);
  console.log(` ok`);
  console.log(`\n✔ Seed listo:`);
  console.log(`   ${done.length} usuarios + posts`);
  console.log(`   ${eng.follows} follows · ${eng.likes} likes · ${eng.comments} comentarios · ${eng.votes} votos`);
  console.log(`\n   Para borrar todo esto después:  npm run seed:community -- --clean --apply\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
