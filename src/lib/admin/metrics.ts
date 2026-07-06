import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Forma del jsonb que devuelve la función SQL public.admin_metrics().
export type AdminMetrics = {
  generated_at: string;
  users: { total: number; pro: number; free: number; new_7d: number; new_30d: number };
  signups_by_day: { day: string; count: number }[];
  analyses: {
    total: number;
    valid: number;
    invalid: number;
    pending: number;
    distinct_users: number;
    avg_score: number;
  };
  analyses_by_day: { day: string; count: number }[];
  by_occasion: { occasion: string; count: number }[];
  top_users: { name: string; count: number }[];
  community: {
    posts: number;
    reactions: number;
    comments: number;
    follows: number;
    distinct_posters: number;
  };
  top_posts: { name: string; caption: string | null; likes: number; created_at: string }[];
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = createAdminClient();
  // admin_metrics no está en los tipos generados de la DB; cast puntual.
  const { data, error } = await admin.rpc("admin_metrics" as never);
  if (error) {
    throw new Error(`admin_metrics falló: ${error.message}`);
  }
  return data as unknown as AdminMetrics;
}
