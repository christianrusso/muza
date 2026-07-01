import type { PlanTier } from "@/types/domain";
import { PLAN_LIMITS } from "./limits";

export function canCreateAnalysis({
  planTier,
  currentMonthCount,
}: {
  planTier: PlanTier;
  currentMonthCount: number;
}): boolean {
  const limit = PLAN_LIMITS[planTier].monthlyAnalyses;
  if (limit === null) return true;
  return currentMonthCount < limit;
}

export function historyCutoffDate(planTier: PlanTier): Date | null {
  const days = PLAN_LIMITS[planTier].historyWindowDays;
  if (days === null) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}
