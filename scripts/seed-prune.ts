// ============================================================================
// LookLab — Poda de seed (borra un % de un universo de cuentas semilla)
// ============================================================================
// Retira gradualmente el contenido sintético a medida que entran usuarios
// reales. Poda un % AL AZAR del universo elegido.
//
// SEGURO POR DEFECTO: sin --apply solo muestra el plan (dry-run), no borra nada.
// El borrado es IRREVERSIBLE: deleteUser cascadea profile/analyses/posts/votos/
// etc., y además se borra la carpeta del usuario en storage.
//
// Selección del universo (elegí UNO):
//   --batch <tag>     cuentas con user_metadata.seed_batch = <tag>  (default migrate-v1)
//   --domain <dom>    cuentas cuyo email termina en @<dom>  (ej: looklab.seed)
//
// Uso:
//   npm run seed:prune                            # dry-run sobre migrate-v1
//   npm run seed:prune -- --apply                 # borra 20% de migrate-v1 (irreversible)
//   npm run seed:prune -- --domain looklab.seed   # dry-run sobre las @looklab.seed
//   npm run seed:prune -- --domain looklab.seed --apply
//   npm run seed:prune -- --pct 10                # porcentaje a podar (default 20)
//
// Requiere en .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (service role: bypassa RLS)
// ============================================================================

import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BUCKET = "outfit-photos";
const DEFAULT_BATCH = "migrate-v1";
const DEFAULT_PCT = 20;

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
function shuffle<T>(a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function makeSupabase(): SupabaseClient {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local"); process.exit(1); }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Todas las cuentas que matchean el predicado, paginando auth.users.
async function listMatching(supabase: SupabaseClient, match: (u: User) => boolean): Promise<User[]> {
  const out: User[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error(error.message); break; }
    out.push(...data.users.filter(match));
    if (data.users.length < 200) break;
    page++;
  }
  return out;
}

async function deleteAccount(supabase: SupabaseClient, u: User) {
  const { data: files } = await supabase.storage.from(BUCKET).list(u.id);
  if (files?.length) await supabase.storage.from(BUCKET).remove(files.map((f) => `${u.id}/${f.name}`));
  await supabase.auth.admin.deleteUser(u.id); // cascade borra profile/analyses/posts/votos/etc.
}

async function main() {
  const apply = has("apply");
  const domain = arg("domain");
  const batch = domain ? undefined : (arg("batch") ?? DEFAULT_BATCH);
  const pct = Number(arg("pct") ?? DEFAULT_PCT);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) { console.error(`✖ --pct inválido: ${arg("pct")}`); process.exit(1); }

  const match = domain
    ? (u: User) => (u.email ?? "").endsWith(`@${domain}`)
    : (u: User) => (u.user_metadata as { seed_batch?: string } | undefined)?.seed_batch === batch;
  const universe = domain ? `@${domain}` : `seed_batch=${batch}`;

  const supabase = makeSupabase();
  const all = await listMatching(supabase, match);
  const target = Math.round(all.length * (pct / 100));

  console.log(`\n✂️  Poda de seed (${apply ? "APLICAR" : "DRY-RUN"})`);
  console.log(`   universo:        ${universe}`);
  console.log(`   cuentas:         ${all.length}`);
  console.log(`   a podar (~${pct}%): ${target}`);

  if (all.length === 0) { console.log(`\n(no hay cuentas para ${universe}; nada que hacer.)\n`); return; }

  const chosen = shuffle([...all]).slice(0, target);
  console.log(`\n   Seleccionadas al azar (${chosen.length}):`);
  for (const u of chosen) console.log(`     ${u.email}`);

  if (!apply) { console.log(`\n(dry-run: no se borró nada. Agregá --apply para ejecutar. IRREVERSIBLE.)\n`); return; }

  console.log(`\n🗑️  Borrando…`);
  let removed = 0;
  for (const u of chosen) {
    await deleteAccount(supabase, u);
    removed++;
    process.stdout.write(`\r   borradas ${removed}/${chosen.length}`);
  }
  console.log(`\n✔ Listo: ${removed} cuentas de ${universe} eliminadas (${all.length - removed} quedan).\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
