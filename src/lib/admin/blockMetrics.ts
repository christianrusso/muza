import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

export type AdminBlockMetrics = {
  generated_at: string;
  active_blocks: number;
  blocks_last_7_days: number;
  blocks_last_30_days: number;
  unblocks_last_7_days: number;
  unblocks_last_30_days: number;
  unique_blockers: number;
  unique_currently_blocked_users: number;
  unique_historically_blocked_users: number;
  average_blocks_per_blocker: number;
  blocks_by_day: { day: string; count: number }[];
};

function demoMetrics(): AdminBlockMetrics {
  const history = getDemoStore().blockHistory;
  const now = Date.now();
  const within = (date: string | null, days: number) =>
    date ? new Date(date).getTime() >= now - days * 86_400_000 : false;
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    const day = date.toISOString().slice(0, 10);
    return { day, count: history.filter((h) => h.blockedAt.slice(0, 10) === day).length };
  });
  const blockers = new Set(history.map((h) => h.blockerId));
  const active = history.filter((h) => h.unblockedAt === null);
  const currentTargets = new Set(active.map((h) => h.blockedId));
  const historicalTargets = new Set(history.map((h) => h.blockedId));
  return {
    generated_at: new Date().toISOString(),
    active_blocks: active.length,
    blocks_last_7_days: history.filter((h) => within(h.blockedAt, 7)).length,
    blocks_last_30_days: history.filter((h) => within(h.blockedAt, 30)).length,
    unblocks_last_7_days: history.filter((h) => within(h.unblockedAt, 7)).length,
    unblocks_last_30_days: history.filter((h) => within(h.unblockedAt, 30)).length,
    unique_blockers: blockers.size,
    unique_currently_blocked_users: currentTargets.size,
    unique_historically_blocked_users: historicalTargets.size,
    average_blocks_per_blocker: blockers.size ? Number((history.length / blockers.size).toFixed(2)) : 0,
    blocks_by_day: days,
  };
}

export async function getAdminBlockMetrics(): Promise<AdminBlockMetrics> {
  if (isDemoMode()) return demoMetrics();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_block_metrics" as never);
  if (error) throw new Error(`admin_block_metrics falló: ${error.message}`);
  return data as unknown as AdminBlockMetrics;
}
