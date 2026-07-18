// ============================================================================
// Re-reparte las fechas del contenido sembrado
// ============================================================================
// Los 50 usuarios que creó seed-migrate quedaron con sus posts amontonados: la
// tanda más nueva cae toda el mismo día y no hay nada después, así que la
// comunidad se ve congelada y salta a la vista que es contenido de relleno.
//
// Esto reparte los análisis (la "fecha de la foto") y sus posts a lo largo de una
// ventana que llega hasta hoy, con horas variadas. No toca NADA de los usuarios
// reales: el filtro es el lote de creación del seed.
//
// Uso:
//   npx tsx --env-file=.env.local scripts/seed-respread-dates.ts            # simulacro
//   npx tsx --env-file=.env.local scripts/seed-respread-dates.ts --apply    # aplica
// ============================================================================

import { writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const WINDOW_DAYS = 45; // ventana hacia atrás desde hoy

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Los usuarios sembrados nacieron todos en el mismo minuto (la corrida del seed). */
async function seedUserIds(): Promise<Set<string>> {
  const { data } = await db.auth.admin.listUsers({ perPage: 500 });
  const porMinuto = new Map<string, string[]>();
  for (const u of data?.users ?? []) {
    const k = (u.created_at ?? "").slice(0, 16);
    porMinuto.set(k, [...(porMinuto.get(k) ?? []), u.id]);
  }
  // Un lote = más de 5 cuentas creadas en el mismo minuto. Una persona real no
  // se registra 50 veces en 60 segundos.
  const ids = new Set<string>();
  for (const [, lista] of porMinuto) if (lista.length > 5) lista.forEach((id) => ids.add(id));
  return ids;
}

/** Fecha al azar dentro de la ventana, con hora de día verosímil (7 a 23 h). */
function fechaVerosimil(): Date {
  const ahora = Date.now();
  const desde = ahora - WINDOW_DAYS * 86_400_000;
  const d = new Date(desde + Math.random() * (ahora - desde));
  d.setHours(7 + Math.floor(Math.random() * 16), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  // Si la hora quedó en el futuro (hoy), la traemos un rato atrás.
  if (d.getTime() > ahora) d.setTime(ahora - Math.random() * 6 * 3_600_000);
  return d;
}

async function main() {
  const seedIds = await seedUserIds();
  console.log(`usuarios sembrados detectados: ${seedIds.size}`);
  if (seedIds.size === 0) {
    console.log("no se detectó ningún lote — cortamos por las dudas.");
    return;
  }

  // Análisis de esos usuarios (la fecha de la foto).
  const { data: analyses } = await db
    .from("analyses")
    .select("id, user_id, created_at")
    .in("user_id", [...seedIds])
    .limit(2000);

  // Posts de esos análisis (la fecha que se ve en el feed).
  const { data: posts } = await db
    .from("community_posts")
    .select("id, analysis_id, created_at")
    .in("user_id", [...seedIds])
    .limit(2000);

  const postPorAnalisis = new Map((posts ?? []).map((p) => [p.analysis_id as string, p]));
  console.log(`análisis a reubicar: ${analyses?.length ?? 0}  |  posts: ${posts?.length ?? 0}`);

  // Distribución ANTES (por día), para comparar.
  const antes: Record<string, number> = {};
  for (const p of posts ?? []) {
    const d = (p.created_at as string).slice(0, 10);
    antes[d] = (antes[d] ?? 0) + 1;
  }
  const diasAntes = Object.keys(antes).sort();
  console.log(`\nANTES: posts entre ${diasAntes[0]} y ${diasAntes[diasAntes.length - 1]} (${diasAntes.length} días)`);
  const maxAntes = Math.max(...Object.values(antes));
  console.log(`  día más cargado: ${maxAntes} posts`);

  // Nuevas fechas.
  const cambios: { analysisId: string; postId?: string; foto: Date; post: Date }[] = [];
  for (const a of analyses ?? []) {
    const foto = fechaVerosimil();
    // El post sale entre 1 minuto y 3 horas después de la foto.
    const post = new Date(foto.getTime() + (60 + Math.random() * 10_740) * 1000);
    const p = postPorAnalisis.get(a.id as string);
    cambios.push({ analysisId: a.id as string, postId: p?.id as string | undefined, foto, post });
  }

  const despues: Record<string, number> = {};
  for (const c of cambios) if (c.postId) {
    const d = c.post.toISOString().slice(0, 10);
    despues[d] = (despues[d] ?? 0) + 1;
  }
  const diasDespues = Object.keys(despues).sort();
  console.log(`DESPUÉS: posts entre ${diasDespues[0]} y ${diasDespues[diasDespues.length - 1]} (${diasDespues.length} días)`);
  console.log(`  día más cargado: ${Math.max(...Object.values(despues))} posts`);

  if (!APPLY) {
    console.log("\n(simulacro — no se escribió nada. Agregá --apply para aplicar)");
    return;
  }

  // Respaldo antes de pisar: sin esto las fechas originales se pierden y no hay
  // forma de volver atrás. Se guarda al lado del script, fuera de git.
  const backup = {
    generado: new Date().toISOString(),
    analyses: (analyses ?? []).map((a) => ({ id: a.id, created_at: a.created_at })),
    posts: (posts ?? []).map((p) => ({ id: p.id, created_at: p.created_at })),
  };
  const backupPath = `scripts/seed-fechas-backup-${Date.now()}.json`;
  writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\nrespaldo de las fechas originales: ${backupPath}`);

  console.log("aplicando…");
  let n = 0;
  for (const c of cambios) {
    await db.from("analyses").update({ created_at: c.foto.toISOString() }).eq("id", c.analysisId);
    if (c.postId) await db.from("community_posts").update({ created_at: c.post.toISOString() }).eq("id", c.postId);
    if (++n % 100 === 0) console.log(`  ${n}/${cambios.length}`);
  }
  console.log(`listo: ${n} análisis y sus posts reubicados.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
