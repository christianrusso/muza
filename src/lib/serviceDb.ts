import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente service-role SIN el genérico Database: para las tablas/funciones de
// infra (ai_rate_limit_hits, ai_usage_log, check_rate_limit, ai_spend_summary)
// que no están en los tipos generados. Bypassa RLS — solo uso server-side.
export function serviceDb(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
