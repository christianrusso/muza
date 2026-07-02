// ============================================================================
// Muza — Sube fotos reales de ejemplo para los looks de los usuarios de prueba
// ============================================================================
// Corré PRIMERO el SQL (supabase/seed_test_users.sql). Este script busca todas
// las `analyses` de los usuarios @muza.test y sube una foto real (Lorem Picsum)
// a `outfit-photos/{user_id}/{analysis_id}.jpg`, que es exactamente el
// `photo_path` que la app espera. Así el historial y la comunidad muestran foto.
//
// Uso:
//   node scripts/seed-photos.mjs
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Es re-ejecutable: usa upsert, así que sobrescribe sin duplicar.
// ============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---- Cargar .env.local sin dependencias externas ----
function loadEnv() {
  const raw = readFileSync(join(ROOT, ".env.local"), "utf8");
  const env = {};
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

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_DOMAIN = "@muza.test";
const CONCURRENCY = 4;

async function main() {
  // 1) IDs de los usuarios de prueba
  console.log("→ Buscando usuarios de prueba…");
  const seedUserIds = new Set();
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email?.endsWith(SEED_DOMAIN)) seedUserIds.add(u.id);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  console.log(`  ${seedUserIds.size} usuarios ${SEED_DOMAIN}`);
  if (seedUserIds.size === 0) {
    console.error("✖ No hay usuarios de prueba. Corré primero supabase/seed_test_users.sql");
    process.exit(1);
  }

  // 2) Analyses de esos usuarios
  const { data: analyses, error: aErr } = await supabase
    .from("analyses")
    .select("id, user_id, photo_path")
    .in("user_id", [...seedUserIds]);
  if (aErr) throw aErr;
  console.log(`→ ${analyses.length} looks para poblar con foto\n`);

  // 3) Descargar + subir con concurrencia limitada
  let done = 0;
  let failed = 0;
  const queue = [...analyses];

  async function worker() {
    for (;;) {
      const a = queue.shift();
      if (!a) return;
      try {
        // Retrato 600x800 (relación de la card). Seed determinístico por look.
        const res = await fetch(`https://picsum.photos/seed/${a.id}/600/800`, { redirect: "follow" });
        if (!res.ok) throw new Error(`descarga HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());

        const { error: upErr } = await supabase.storage
          .from("outfit-photos")
          .upload(a.photo_path, buf, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;

        done += 1;
        process.stdout.write(`\r  subidas ${done}/${analyses.length}  (errores: ${failed})`);
      } catch (err) {
        failed += 1;
        console.error(`\n  ✖ ${a.photo_path}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n\n✔ Listo: ${done} fotos subidas, ${failed} errores.`);
}

main().catch((err) => {
  console.error("\n✖ Error fatal:", err);
  process.exit(1);
});
