import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[m[1]] = v;
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
function bucketOf(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h % 2; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ADVANCED = "2026-06-01T00:00:00Z"; // marca > esto = el cron la avanzó (envío OK)

// email map
const idToEmail = {};
for (let page = 1; page <= 30; page++) {
  const { data: pg } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (!pg?.users?.length) break;
  for (const u of pg.users) idToEmail[u.id] = u.email;
  if (pg.users.length < 200) break;
}

// los 12 armados = marca en 2026-01 (sentinel OLD)
const { data: armed } = await admin
  .from("profiles").select("id")
  .gte("last_activity_email_at", "2026-01-01T00:00:00Z")
  .lt("last_activity_email_at", "2026-01-02T00:00:00Z");
const targets = (armed ?? []).map((r) => r.id);
const b0 = targets.filter((id) => bucketOf(id) === 0); // franja 13:00 UTC

const deadline = Date.now() + 76 * 60 * 1000; // ~13:20 UTC
let announced13 = false;
while (Date.now() < deadline) {
  const { data } = await admin.from("profiles").select("id, last_activity_email_at").in("id", targets);
  const sent = (data ?? []).filter((r) => r.last_activity_email_at > ADVANCED);
  const b0sent = sent.filter((r) => bucketOf(r.id) === 0);
  const t = new Date().toISOString().slice(11, 16);
  if (!announced13 && b0sent.length > 0) {
    announced13 = true;
    console.log(`[${t}Z] CRON 13:00 CORRIO — enviados franja 13:00: ${b0sent.length}/${b0.length}`);
    for (const r of b0sent) console.log(`   OK → ${idToEmail[r.id] ?? r.id}`);
    const notSent = b0.filter((id) => !b0sent.find((r) => r.id === id));
    for (const id of notSent) console.log(`   NO envió → ${idToEmail[id] ?? id}`);
    process.exit(0);
  }
  await sleep(90 * 1000);
}
console.log(`[${new Date().toISOString().slice(11,16)}Z] DEADLINE sin envíos de la franja 13:00 — el cron NO corrió o falló. Revisar Vercel logs.`);
