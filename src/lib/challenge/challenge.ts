import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signedPhotoUrl } from "@/lib/supabase/photos";
import { occasionLabel } from "@/lib/occasions";
import { OCCASIONS } from "@/lib/occasions";
import { isDemoMode } from "@/lib/demo";
import type { OccasionId } from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;

// Separación mínima de score entre looks adyacentes del trío: si están muy juntos
// (78/80/82) el "correcto" se siente arbitrario. Con gap claro, es defendible.
const MIN_GAP = 12;
// No repetir looks usados en los últimos N días.
const RECENT_DAYS = 7;

export interface ChallengeLook {
  postId: string;
  photoUrl: string | null;
}

export interface TodayChallenge {
  date: string;
  occasionId: string;
  occasionLabel: string;
  looks: ChallengeLook[]; // orden de muestra (barajado); sin scores
}

export interface ChallengeReveal {
  winnerPostId: string;
  scores: Record<string, number>;
  reason: string | null;
}

// ===== Fechas (día en horario Argentina, UTC-3) =====
function arDate(d = new Date()): string {
  return new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}
function prevDate(dateStr: string): string {
  return new Date(new Date(`${dateStr}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
}
export function challengeDate(): string {
  return arDate();
}

// ===== Modo demo: reto sintético (sin backend) =====
const DEMO_CHALLENGE: TodayChallenge = {
  date: "demo",
  occasionId: "casual",
  occasionLabel: "Casual",
  looks: [
    { postId: "demo-look-a", photoUrl: null },
    { postId: "demo-look-b", photoUrl: null },
    { postId: "demo-look-c", photoUrl: null },
  ],
};
const DEMO_REVEAL: ChallengeReveal = {
  winnerPostId: "demo-look-b",
  scores: { "demo-look-a": 64, "demo-look-b": 88, "demo-look-c": 47 },
  reason: "Excelente combinación de colores neutros",
};
export function isDemoChallenge(): boolean {
  return isDemoMode();
}
export function demoChallenge(): TodayChallenge {
  return DEMO_CHALLENGE;
}
export function demoReveal(): ChallengeReveal {
  return DEMO_REVEAL;
}

// ===== Barajado determinístico por fecha (mismo orden para todos ese día) =====
function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  let seed = 0;
  for (const ch of seedStr) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Candidate = { post_id: string; occasion_id: string; overall_score: number };

// Elige 3 con separación de score clara (greedy sobre la lista ordenada desc).
function pickTriple(sorted: Candidate[], gap: number): Candidate[] | null {
  const winner = sorted[0];
  if (!winner) return null;
  const second = sorted.find((c) => c.overall_score <= winner.overall_score - gap);
  if (!second) return null;
  const third = sorted.find((c) => c.overall_score <= second.overall_score - gap);
  if (!third) return null;
  return [winner, second, third];
}

// Genera el reto del día: elige ocasión (rotación diaria) y un trío con gap claro,
// evitando looks usados hace poco. Inserta con service-role. Devuelve la fila.
async function generate(admin: AdminClient, date: string) {
  const { data: cands } = await admin
    .from("community_feed_view")
    .select("post_id, occasion_id, overall_score")
    .not("overall_score", "is", null);
  const candidates = (cands ?? []).filter(
    (c): c is Candidate => typeof c.overall_score === "number",
  );

  // Looks usados en los últimos retos: no repetir.
  const { data: recent } = await admin
    .from("daily_challenges")
    .select("look_ids")
    .order("challenge_date", { ascending: false })
    .limit(RECENT_DAYS);
  const used = new Set<string>();
  for (const r of recent ?? []) for (const id of r.look_ids ?? []) used.add(id);
  const fresh = candidates.filter((c) => !used.has(c.post_id));

  // Agrupar por ocasión.
  const byOccasion = new Map<string, Candidate[]>();
  for (const c of fresh) {
    const list = byOccasion.get(c.occasion_id) ?? [];
    list.push(c);
    byOccasion.set(c.occasion_id, list);
  }

  // Orden de ocasiones: rotación determinística por día (para variar el tema).
  const dayNum = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
  const ids = OCCASIONS.map((o) => o.id as string);
  const rotated = [...ids.slice(dayNum % ids.length), ...ids.slice(0, dayNum % ids.length)];

  // Buscar el primer trío válido (gap normal, luego relajado).
  let triple: Candidate[] | null = null;
  let chosenOccasion = "";
  for (const gap of [MIN_GAP, 8]) {
    for (const occ of rotated) {
      const list = (byOccasion.get(occ) ?? []).slice().sort((a, b) => b.overall_score - a.overall_score);
      const t = pickTriple(list, gap);
      if (t) {
        triple = t;
        chosenOccasion = occ;
        break;
      }
    }
    if (triple) break;
  }
  if (!triple) return null; // no hay contenido suficiente todavía

  const winner = triple[0];
  const lookIds = seededShuffle(triple.map((c) => c.post_id), date);

  // Insertar (idempotente por PK date). Si otro request se adelantó, ignora.
  await admin
    .from("daily_challenges")
    .upsert(
      { challenge_date: date, occasion_id: chosenOccasion, look_ids: lookIds, winner_post_id: winner.post_id },
      { onConflict: "challenge_date", ignoreDuplicates: true },
    );

  const { data: row } = await admin
    .from("daily_challenges")
    .select("challenge_date, occasion_id, look_ids, winner_post_id")
    .eq("challenge_date", date)
    .single();
  return row;
}

// Reto de hoy (lo genera la primera vez que alguien lo abre). Sin scores al cliente.
export async function getOrCreateTodayChallenge(): Promise<TodayChallenge | null> {
  if (isDemoMode()) return demoChallenge();
  const admin = createAdminClient();
  const date = challengeDate();

  let { data: row } = await admin
    .from("daily_challenges")
    .select("challenge_date, occasion_id, look_ids, winner_post_id")
    .eq("challenge_date", date)
    .maybeSingle();
  if (!row) row = await generate(admin, date);
  if (!row) return null;

  // Fotos firmadas (service-role: funciona igual para invitados).
  const { data: posts } = await admin
    .from("community_feed_view")
    .select("post_id, photo_path")
    .in("post_id", row.look_ids);
  const pathByPost = new Map((posts ?? []).map((p) => [p.post_id, p.photo_path]));
  const looks: ChallengeLook[] = await Promise.all(
    row.look_ids.map(async (postId) => {
      const path = pathByPost.get(postId);
      return { postId, photoUrl: path ? await signedPhotoUrl(admin, path, "feed") : null };
    }),
  );

  return {
    date,
    occasionId: row.occasion_id,
    occasionLabel: occasionLabel(row.occasion_id as OccasionId),
    looks,
  };
}

// El intento del usuario para una fecha (o null). RLS: solo el propio.
export async function getMyAttempt(
  supabase: SupabaseServerClient,
  userId: string,
  date: string,
): Promise<{ pickedPostId: string; correct: boolean } | null> {
  const { data } = await supabase
    .from("challenge_attempts")
    .select("picked_post_id, correct")
    .eq("user_id", userId)
    .eq("challenge_date", date)
    .maybeSingle();
  return data ? { pickedPostId: data.picked_post_id, correct: data.correct } : null;
}

// Datos del revelado: ganador, scores de los 3 y la fortaleza top del ganador.
export async function buildReveal(date: string): Promise<ChallengeReveal | null> {
  if (isDemoMode()) return demoReveal();
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("daily_challenges")
    .select("look_ids, winner_post_id")
    .eq("challenge_date", date)
    .maybeSingle();
  if (!row) return null;

  const { data: posts } = await admin
    .from("community_feed_view")
    .select("post_id, overall_score, analysis_id")
    .in("post_id", row.look_ids);
  const scores: Record<string, number> = {};
  let winnerAnalysisId: string | null = null;
  for (const p of posts ?? []) {
    scores[p.post_id] = p.overall_score ?? 0;
    if (p.post_id === row.winner_post_id) winnerAnalysisId = p.analysis_id;
  }

  let reason: string | null = null;
  if (winnerAnalysisId) {
    const { data: fb } = await admin
      .from("analysis_feedback")
      .select("text")
      .eq("analysis_id", winnerAnalysisId)
      .eq("kind", "fortaleza")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    reason = fb?.text ?? null;
  }

  return { winnerPostId: row.winner_post_id, scores, reason };
}

// Racha: días consecutivos jugados terminando en `date` (o ayer si hoy no jugó).
export async function getStreak(
  supabase: SupabaseServerClient,
  userId: string,
  date: string,
): Promise<number> {
  const { data } = await supabase
    .from("challenge_attempts")
    .select("challenge_date")
    .eq("user_id", userId)
    .order("challenge_date", { ascending: false })
    .limit(90);
  const days = new Set((data ?? []).map((r) => r.challenge_date));
  if (days.size === 0) return 0;
  // Arranca en hoy si jugó hoy; si no, en ayer (para no romper la racha antes de jugar).
  let cursor = days.has(date) ? date : prevDate(date);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = prevDate(cursor);
  }
  return streak;
}
