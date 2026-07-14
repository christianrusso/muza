// ============================================================================
// LookLab — Seed de migración (50 cuentas "reales" + posts sintéticos)
// ============================================================================
// Puebla la comunidad con 50 usuarios de nombres y emails que parecen reales
// (no @looklab.seed) y reparte TODAS las fotos de seed-fotos/ entre ellos como
// posts. A diferencia de seed-community.ts, acá NO se llama a OpenAI: el scoring
// (puntaje, categorías, badge, feedback, prendas detectadas) se genera de forma
// SINTÉTICA pero válida — mismos pesos/algoritmo (computeOverallScore) que la app.
// Encima suma follows / likes / comentarios / votos ENTRE las 50 cuentas.
//
// SEGURO POR DEFECTO: sin --apply solo muestra el plan (dry-run), no escribe nada.
//
// Uso:
//   npm run seed:migrate                     # dry-run (ver el plan)
//   npm run seed:migrate -- --apply           # crea todo de verdad (sin OpenAI)
//   npm run seed:migrate -- --clean --apply   # borra SOLO estas cuentas (tag en metadata)
//   npm run seed:migrate -- --users 50        # cantidad de usuarios (default 50)
//   npm run seed:migrate -- --dir seed-fotos  # carpeta de fotos (default)
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (service role: bypassa RLS)
//
// Estructura de seed-fotos/ soportada:
//   - Carpetas de ocasión (casual, trabajo, fiesta, …) con archivos "f-…"/"m-…"
//     → ocasión = carpeta, género = prefijo, tipo = completo.
//   - Carpetas masivas por género/tipo (nombre libre): la clasificación sale de
//     palabras clave en el nombre: female|women → femenino, male|men → masculino;
//     upper → superior, lower → inferior; si no, completo. Ocasión = aleatoria.
//   - "randoms" (sin género ni ocasión) → género no_especifica, ocasión aleatoria.
// ============================================================================

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeOverallScore, applicableCategories, scoreBand, SCORE_CATEGORIES } from "@/lib/scoring/categories";
import type { AnalysisType, OccasionId, UserGender } from "@/types/domain";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const BUCKET = "outfit-photos";
const BATCH_TAG = "migrate-v1"; // marca en user_metadata para identificar/limpiar SOLO estas cuentas
const SPREAD_DAYS = 30; // repartimos las fechas de posteo en los últimos N días
const DEFAULT_USERS = 50;

// carpeta de ocasión (español) -> id de ocasión (el que usa la app)
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

// Ocasión aleatoria para las fotos sin carpeta de ocasión (full/parciales/randoms).
// Sesgada hacia lo cotidiano para que el feed se sienta natural.
const RANDOM_OCCASIONS: OccasionId[] = ["casual", "casual", "casual", "work", "work", "party", "date", "travel", "gym", "other"];

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// ---- nombres / emails "reales" ----
const FIRST_F = ["Martina", "Valentina", "Sofía", "Camila", "Julieta", "Lucía", "Micaela", "Agustina", "Carla", "Florencia", "Rocío", "Brenda", "Paula", "Daniela", "Antonella", "Belén", "Milagros", "Carolina", "Malena", "Victoria", "Delfina", "Abril", "Catalina", "Renata", "Guadalupe", "Ariana", "Josefina", "Pilar", "Morena", "Bianca"];
const FIRST_M = ["Tomás", "Mateo", "Juan", "Facundo", "Lucas", "Nicolás", "Santiago", "Franco", "Bruno", "Ignacio", "Matías", "Joaquín", "Gonzalo", "Lautaro", "Ramiro", "Diego", "Pablo", "Emiliano", "Thiago", "Benjamín", "Agustín", "Valentín", "Gael", "Bautista", "Máximo", "Julián", "Federico", "Martín", "Ezequiel", "Nahuel"];
const LAST = ["González", "Rodríguez", "Fernández", "López", "Martínez", "García", "Pérez", "Gómez", "Sánchez", "Romero", "Díaz", "Álvarez", "Torres", "Ruiz", "Ramírez", "Flores", "Benítez", "Acosta", "Medina", "Herrera", "Aguirre", "Molina", "Castro", "Rojas", "Ortiz", "Silva", "Núñez", "Gutiérrez", "Sosa", "Vega", "Cabrera", "Ríos", "Godoy", "Ferreyra", "Luna", "Ledesma", "Ojeda", "Peralta", "Villalba", "Cardozo"];
const EMAIL_DOMAINS = ["gmail.com", "gmail.com", "gmail.com", "hotmail.com", "hotmail.com", "outlook.com", "yahoo.com.ar", "icloud.com"];

// ---- captions / comentarios (mismos tonos que seed-community) ----
const CAPTIONS = [null, null, null, null, "¿Aprueban? 👀", "Mi look de hoy", "A ver qué dicen 🙏", "Nuevo fit", "Para la ocasión 🔥", "¿Le pego o no?", "Opinen 🙌", "Probando algo distinto", null, null];
const COMMENTS = ["Buenísimo 🔥", "Me encanta", "Team este look", "Combina todo", "Groso/a", "Divino/a 😍", "Le doy un 9", "Zafa jaja", "Le cambiaría el calzado", "No me convence del todo", "Buenísima elección", "Impecable", "Un golazo", "Lo copio 🙌", "Re va con la ocasión"];

// ---- bancos para el scoring sintético ----
const STYLE_DESC = ["minimalista", "urbano", "clásico", "casual", "elegante", "street", "moderno", "relajado", "canchero", "sobrio", "monocromático", "deportivo", "romántico", "boho", "sport chic"];
const BADGES_HIGH = ["Impecable", "Muy bien logrado", "Buen ojo", "De revista", "Elegante", "Bien resuelto", "Nivel editorial"];
const BADGES_MID = ["Prolijo", "Correcto", "Va bien", "Sólido", "Cumple", "Bien encaminado"];
const BADGES_LOW = ["A pulir", "Se puede mejorar", "Casi", "Con potencial"];
const SUP_F = ["blusa", "remera básica", "top", "camisa oversize", "sweater tejido", "crop top", "camisa de lino", "blazer", "musculosa"];
const SUP_M = ["remera lisa", "camisa", "buzo", "camisa de lino", "sweater", "chomba", "campera de jean", "blazer", "remera oversize"];
const INF_F = ["jean wide leg", "pollera midi", "pantalón sastrero", "short de jean", "calza", "vestido", "pantalón palazzo"];
const INF_M = ["jean recto", "pantalón cargo", "jogger", "bermuda", "chino", "pantalón sastrero", "jean slim"];
const CAL_F = ["zapatillas blancas", "botas", "sandalias", "borcegos", "balerinas", "zapatillas urbanas"];
const CAL_M = ["zapatillas blancas", "zapatillas retro", "borcegos", "mocasines", "zapatillas urbanas", "náuticos"];
const ACC = ["reloj", "gorra", "lentes de sol", "cadena", "mochila", "cinturón", "aros", "pañuelo", "riñonera", "tote bag"];
const COLORS = ["negro", "blanco", "beige", "azul", "gris", "verde militar", "camel", "denim", "bordó", "crema", "tierra", "celeste"];
const STYLES = ["casual", "urbano", "clásico", "minimalista", "street", "elegante sport", "relajado"];
const STRENGTHS = [
  "La paleta de colores está bien equilibrada.",
  "El fit de la prenda superior te queda muy bien.",
  "Buena elección de calzado para el conjunto.",
  "El outfit se ve coherente y armónico.",
  "Las proporciones están bien logradas.",
  "Look apropiado para la ocasión.",
  "Los accesorios suman sin recargar.",
  "Prendas en buen estado y bien combinadas.",
  "Buen uso de los neutros como base.",
];
const IMPROVEMENTS = [
  "El calzado podría acompañar mejor el resto.",
  "Probá una paleta un poco más acotada.",
  "El fit del pantalón se puede ajustar.",
  "Faltaría un accesorio que aporte contraste.",
  "Cuidá el planchado de la prenda superior.",
  "Las proporciones se pueden equilibrar mejor.",
  "El conjunto pide un punto de color.",
];
const RECOMMENDATIONS = [
  "Sumá una prenda neutra para balancear.",
  "Un calzado más limpio elevaría el look.",
  "Probá remangar la camisa para un aire más relajado.",
  "Un cinturón ayudaría a marcar la silueta.",
  "Considerá una campera liviana para las capas.",
  "Colores tierra combinarían muy bien acá.",
  "Un reloj simple redondearía el conjunto.",
];

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
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
function shuffle<T>(a: T[]): T[] { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; }
function sample<T>(arr: T[], min: number, max: number): T[] { return shuffle(arr).slice(0, Math.min(arr.length, randInt(min, max))); }
// timestamp aleatorio dentro de los últimos SPREAD_DAYS
const staggeredDate = () => new Date(Date.now() - randInt(1, SPREAD_DAYS) * 86400_000 - randInt(0, 82800) * 1000).toISOString();
// timestamp posterior a `iso` (para engagement después del post), sin pasarse de ahora
const afterDate = (iso: string) => new Date(Math.min(Date.now(), new Date(iso).getTime() + randInt(60, 72 * 3600) * 1000)).toISOString();
const bucketForScore = (s: number) => (s < 40 ? "low" : s > 74 ? "high" : "mid");
const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ---- clasificación de fotos ----
interface SeedPhoto { absPath: string; fileName: string; occasionId: OccasionId; gender: UserGender; analysisType: AnalysisType; }

// Deriva género/tipo de una carpeta masiva por palabras clave del nombre.
// OJO con el orden: "female" contiene "male", así que femenino se chequea primero.
function classifyBulkFolder(folder: string): { gender: UserGender; analysisType: AnalysisType } {
  const n = folder.toLowerCase();
  const gender: UserGender = /female|women|femenino|mujer/.test(n)
    ? "femenino"
    : /male|men|masculino|hombre/.test(n)
      ? "masculino"
      : "no_especifica";
  const analysisType: AnalysisType = /upper|superior/.test(n) ? "superior" : /lower|inferior/.test(n) ? "inferior" : "completo";
  return { gender, analysisType };
}

function gatherPhotos(dir: string): SeedPhoto[] {
  const out: SeedPhoto[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const folderPath = join(dir, entry);
    let isDir = false;
    try { isDir = statSync(folderPath).isDirectory(); } catch { continue; }
    if (!isDir) continue;

    const occFromFolder = FOLDER_TO_OCCASION[entry];
    const bulk = occFromFolder ? null : classifyBulkFolder(entry);

    for (const f of readdirSync(folderPath).sort()) {
      const ext = extname(f).toLowerCase();
      if (!MIME[ext]) continue;

      if (occFromFolder) {
        // carpeta de ocasión: género por prefijo f/m, tipo completo
        const prefix = f[0]?.toLowerCase();
        if (prefix !== "f" && prefix !== "m") continue;
        out.push({ absPath: join(folderPath, f), fileName: f, occasionId: occFromFolder, gender: prefix === "f" ? "femenino" : "masculino", analysisType: "completo" });
      } else {
        // carpeta masiva: género/tipo del nombre, ocasión aleatoria
        out.push({ absPath: join(folderPath, f), fileName: f, occasionId: pick(RANDOM_OCCASIONS), gender: bulk!.gender, analysisType: bulk!.analysisType });
      }
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

// ---- scoring SINTÉTICO (sin OpenAI), válido contra el algoritmo real ----
// Distribución de calidad: mayoría decente/buena, algunos flojos. Devuelve un
// objeto con la misma forma que ScoringResult para reusar el pipeline de guardado.
function qualityBase(): number {
  const r = Math.random();
  if (r < 0.10) return randInt(38, 55); // flojo
  if (r < 0.45) return randInt(60, 73); // medio
  if (r < 0.85) return randInt(74, 87); // bueno
  return randInt(88, 96); // muy bueno
}

function syntheticScoring(gender: UserGender, analysisType: AnalysisType) {
  const base = qualityBase();
  // cada categoría orbita alrededor de base; la ocasión con piso 30 para que a
  // veces el techo (occasionCeiling) recorte el overall como en la app real.
  const categories = SCORE_CATEGORIES.map((c) => ({
    key: c.key,
    score: c.key === "ocasion" ? clamp(base + randInt(-6, 10), 30, 100) : clamp(base + randInt(-13, 13), 0, 100),
    justification: null as string | null,
  }));

  const isF = gender === "femenino";
  const sup = isF ? SUP_F : SUP_M;
  const inf = isF ? INF_F : INF_M;
  const cal = isF ? CAL_F : CAL_M;
  const detected = {
    prendasSuperiores: analysisType === "inferior" ? [] : sample(sup, 1, 2),
    prendasInferiores: analysisType === "superior" ? [] : sample(inf, 1, 1),
    calzado: analysisType === "completo" || analysisType === "inferior" ? sample(cal, 1, 1) : [],
    accesorios: Math.random() < 0.6 ? sample(ACC, 1, 2) : [],
    colores: sample(COLORS, 2, 3),
    estilo: pick(STYLES),
  };

  const overall = computeOverallScore(categories, analysisType);
  const band = scoreBand(overall);
  const badge = pick(band === "high" ? BADGES_HIGH : band === "medium" ? BADGES_MID : BADGES_LOW);

  return {
    result: {
      analysisType,
      styleDescriptors: sample(STYLE_DESC, 2, 3),
      occasionContext: null as string | null,
      categories,
      qualitativeBadge: badge,
      detected,
      strengths: sample(STRENGTHS, 2, 3),
      improvements: sample(IMPROVEMENTS, 1, 2),
      recommendations: sample(RECOMMENDATIONS, 1, 2),
    },
    overall,
  };
}

// ---- usuarios ----
interface SeedUser { id: string; name: string; gender: UserGender; email: string; }

function buildIdentities(count: number, fCount: number, mCount: number): { name: string; gender: UserGender; email: string }[] {
  const total = fCount + mCount || 1;
  const fUsers = clamp(Math.round(count * (fCount / total)), 1, count - 1);
  const mUsers = count - fUsers;
  const genders: UserGender[] = [...Array(fUsers).fill("femenino"), ...Array(mUsers).fill("masculino")];

  const usedNames = new Set<string>();
  const usedEmails = new Set<string>();
  const out: { name: string; gender: UserGender; email: string }[] = [];
  for (const gender of shuffle(genders)) {
    const firsts = gender === "femenino" ? FIRST_F : FIRST_M;
    let first = "", last = "", name = "";
    for (let t = 0; t < 400; t++) { first = pick(firsts); last = pick(LAST); name = `${first} ${last}`; if (!usedNames.has(name)) break; }
    usedNames.add(name);

    const f = stripAccents(first).toLowerCase();
    const l = stripAccents(last).toLowerCase().replace(/\s+/g, "");
    const domain = pick(EMAIL_DOMAINS);
    let email = "";
    for (let t = 0; t < 50; t++) {
      const local =
        t === 0 ? `${f}.${l}` :
        t === 1 ? `${f}${l}` :
        t === 2 ? `${f}.${l}${randInt(1, 99)}` :
        t === 3 ? `${f}_${l}` :
        `${f}.${l}${randInt(100, 9999)}`;
      email = `${local}@${domain}`;
      if (!usedEmails.has(email)) break;
    }
    usedEmails.add(email);
    out.push({ name, gender, email });
  }
  return out;
}

async function createUsers(supabase: SupabaseClient, identities: { name: string; gender: UserGender; email: string }[]): Promise<SeedUser[]> {
  const users: SeedUser[] = [];
  let i = 0;
  for (const id of identities) {
    i++;
    process.stdout.write(`\r   creando usuarios ${i}/${identities.length}…    `);
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: id.email,
      password: randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: id.name, seed: true, seed_batch: BATCH_TAG },
    });
    if (error || !created.user) { console.error(`\n✖ ${id.email}: no se pudo crear: ${error?.message}`); continue; }
    // el trigger crea el profile; completamos nombre + género
    await supabase.from("profiles").update({ full_name: id.name, gender: id.gender }).eq("id", created.user.id);
    users.push({ id: created.user.id, name: id.name, gender: id.gender, email: id.email });
  }
  console.log(`\r   ✔ ${users.length}/${identities.length} usuarios creados.        `);
  return users;
}

// ---- una foto asignada a un usuario -> análisis + post ----
async function createPost(
  supabase: SupabaseClient,
  user: SeedUser,
  photo: SeedPhoto,
): Promise<{ userId: string; postId: string; overall: number; postedAt: string } | null> {
  const buf = readFileSync(photo.absPath);
  const ext = extname(photo.fileName).toLowerCase();
  const contentType = MIME[ext] ?? "image/jpeg";
  const photoPath = `${user.id}/${randomUUID()}${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(photoPath, buf, { contentType });
  if (upErr) { console.error(`\n✖ ${photo.fileName}: falló subir foto: ${upErr.message}`); return null; }

  const { result, overall } = syntheticScoring(user.gender, photo.analysisType);
  const analysisDate = staggeredDate();

  const { data: analysis, error: aErr } = await supabase.from("analyses").insert({
    user_id: user.id,
    occasion_id: photo.occasionId,
    photo_path: photoPath,
    analysis_type: photo.analysisType,
    validity_status: "valid",
    overall_score: overall,
    qualitative_badge: result.qualitativeBadge,
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
    applicableCategories(result.categories, photo.analysisType).map((c) => ({
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

  const postDate = new Date(new Date(analysisDate).getTime() + randInt(1, 120) * 60_000).toISOString();
  const { data: post, error: pErr } = await supabase.from("community_posts")
    .insert({ user_id: user.id, analysis_id: analysisId, caption: pick(CAPTIONS), created_at: postDate })
    .select("id").single();
  if (pErr || !post) { console.error(`\n✖ ${photo.fileName}: falló publicar: ${pErr?.message}`); return null; }

  return { userId: user.id, postId: post.id, overall, postedAt: postDate };
}

// ---- engagement entre las cuentas semilla ----
async function seedEngagement(
  supabase: SupabaseClient,
  userIds: string[],
  posts: { userId: string; postId: string; overall: number; postedAt: string }[],
) {
  // follows: cada usuario sigue a 2-10 otros al azar
  const follows: { follower_id: string; following_id: string; created_at: string }[] = [];
  const seen = new Set<string>();
  for (const follower of userIds) {
    for (const following of shuffle(userIds.filter((u) => u !== follower)).slice(0, randInt(2, 10))) {
      const key = `${follower}|${following}`;
      if (seen.has(key)) continue;
      seen.add(key);
      follows.push({ follower_id: follower, following_id: following, created_at: staggeredDate() });
    }
  }
  if (follows.length) await supabase.from("follows").insert(follows);

  // likes / comentarios / votos por post — votantes distintos (respeta unique(post_id,user_id))
  const likes: { post_id: string; user_id: string; reaction: string; created_at: string }[] = [];
  const comments: { post_id: string; user_id: string; body: string; created_at: string }[] = [];
  const votes: { post_id: string; user_id: string; bucket: string; created_at: string }[] = [];
  for (const p of posts) {
    const others = shuffle(userIds.filter((u) => u !== p.userId));
    for (const u of others.slice(0, randInt(0, 12))) likes.push({ post_id: p.postId, user_id: u, reaction: "like", created_at: afterDate(p.postedAt) });
    if (Math.random() < 0.35) for (const u of others.slice(0, randInt(1, 3))) comments.push({ post_id: p.postId, user_id: u, body: pick(COMMENTS), created_at: afterDate(p.postedAt) });
    // votos: 4-12 votantes, sesgados hacia la franja real del score (con ruido)
    const truth = bucketForScore(p.overall);
    for (const u of others.slice(0, randInt(4, 12))) {
      const b = Math.random() < 0.7 ? truth : pick(["low", "mid", "high"]);
      votes.push({ post_id: p.postId, user_id: u, bucket: b, created_at: afterDate(p.postedAt) });
    }
  }
  // insertamos en chunks para no armar payloads gigantes
  const insertChunked = async (table: string, rows: object[]) => {
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from(table).insert(rows.slice(i, i + 500));
      if (error) console.error(`\n✖ insert ${table}: ${error.message}`);
    }
  };
  await insertChunked("post_reactions", likes);
  await insertChunked("post_comments", comments);
  await insertChunked("post_votes", votes);

  return { follows: follows.length, likes: likes.length, comments: comments.length, votes: votes.length };
}

// ---- limpieza (solo cuentas de este batch, por tag en metadata) ----
async function clean(supabase: SupabaseClient) {
  console.log(`\n🧹 Limpiando cuentas semilla (seed_batch=${BATCH_TAG})…`);
  let page = 1, removed = 0;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error(error.message); break; }
    const seed = data.users.filter((u) => (u.user_metadata as { seed_batch?: string } | undefined)?.seed_batch === BATCH_TAG);
    for (const u of seed) {
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

// ---- reparto de fotos entre usuarios (mismo género; randoms a cualquiera) ----
function assignPhotos(users: SeedUser[], photos: SeedPhoto[]): { user: SeedUser; photo: SeedPhoto }[] {
  const femaleUsers = users.filter((u) => u.gender === "femenino");
  const maleUsers = users.filter((u) => u.gender === "masculino");
  const assignments: { user: SeedUser; photo: SeedPhoto }[] = [];

  const roundRobin = (pool: SeedPhoto[], target: SeedUser[]) => {
    if (target.length === 0) return;
    shuffle(pool).forEach((photo, i) => assignments.push({ user: target[i % target.length], photo }));
  };
  roundRobin(photos.filter((p) => p.gender === "femenino"), femaleUsers.length ? femaleUsers : users);
  roundRobin(photos.filter((p) => p.gender === "masculino"), maleUsers.length ? maleUsers : users);
  roundRobin(photos.filter((p) => p.gender === "no_especifica"), users); // randoms: a cualquiera
  return shuffle(assignments);
}

async function main() {
  const apply = has("apply");
  const dir = resolve(arg("dir") ?? "seed-fotos");
  const userCount = Number(arg("users") ?? DEFAULT_USERS);

  if (has("clean")) {
    if (!apply) { console.log("\n(dry-run: --clean sin --apply no borra nada. Agregá --apply para ejecutar.)\n"); return; }
    await clean(makeSupabase());
    return;
  }

  const photos = gatherPhotos(dir);
  const fCount = photos.filter((p) => p.gender === "femenino").length;
  const mCount = photos.filter((p) => p.gender === "masculino").length;
  const nCount = photos.filter((p) => p.gender === "no_especifica").length;
  const byType: Record<string, number> = {};
  for (const p of photos) byType[p.analysisType] = (byType[p.analysisType] ?? 0) + 1;

  console.log(`\n🌱 Seed de migración (${apply ? "APLICAR" : "DRY-RUN"})  —  sin OpenAI (scoring sintético)`);
  console.log(`   carpeta: ${dir}`);
  console.log(`   fotos encontradas: ${photos.length}   (fem:${fCount} masc:${mCount} neutras:${nCount})`);
  console.log(`   por tipo: ${Object.entries(byType).map(([t, n]) => `${t}:${n}`).join("  ")}`);
  console.log(`   usuarios a crear: ${userCount}  →  ~${(photos.length / userCount).toFixed(1)} posts por usuario`);
  console.log(`   + follows / likes / comentarios / votos entre ellos.`);

  if (!apply) { console.log(`\n(dry-run: no se tocó nada. Agregá --apply para ejecutar.)\n`); return; }
  if (photos.length === 0) { console.error("✖ No hay fotos para sembrar."); process.exit(1); }
  if (!Number.isFinite(userCount) || userCount < 2) { console.error("✖ --users debe ser un número >= 2."); process.exit(1); }

  const supabase = makeSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) { console.error(`✖ No existe el bucket ${BUCKET}.`); process.exit(1); }

  const identities = buildIdentities(userCount, fCount, mCount);
  const users = await createUsers(supabase, identities);
  if (users.length === 0) { console.error("✖ No se creó ningún usuario."); process.exit(1); }

  const assignments = assignPhotos(users, photos);
  const done: { userId: string; postId: string; overall: number; postedAt: string }[] = [];
  let i = 0;
  for (const { user, photo } of assignments) {
    i++;
    process.stdout.write(`\r   publicando ${i}/${assignments.length}…            `);
    const r = await createPost(supabase, user, photo);
    if (r) done.push(r);
  }
  console.log(`\r   ✔ ${done.length}/${assignments.length} posts creados.            `);

  process.stdout.write("   sembrando follows / likes / comentarios / votos…");
  const eng = await seedEngagement(supabase, users.map((u) => u.id), done);
  console.log(" ok");

  console.log(`\n✔ Seed listo:`);
  console.log(`   ${users.length} usuarios · ${done.length} posts`);
  console.log(`   ${eng.follows} follows · ${eng.likes} likes · ${eng.comments} comentarios · ${eng.votes} votos`);
  console.log(`\n   Para borrar todo esto después:  npm run seed:migrate -- --clean --apply\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
