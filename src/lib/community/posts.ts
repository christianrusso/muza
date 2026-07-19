import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_COMMUNITY_POSTS } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";

export interface AnalysisPostRef {
  postId: string;
  commentCount: number;
}

/**
 * Post de comunidad asociado a un análisis (o null si ese análisis todavía no
 * se publicó). Se usa en la pantalla de resultado para decidir entre mostrar el
 * botón "Publicar" o el acceso a los comentarios.
 */
export async function getPostForAnalysis(analysisId: string): Promise<AnalysisPostRef | null> {
  if (isDemoMode()) {
    const created = Array.from(getDemoStore().posts.values()).find((p) => p.analysisId === analysisId);
    if (created) return { postId: created.id, commentCount: created.comments.length };
    const seeded = DEMO_COMMUNITY_POSTS.find((p) => p.analysis_id === analysisId);
    if (seeded) return { postId: seeded.post_id, commentCount: seeded.comment_count };
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("community_feed_view")
    .select("post_id, comment_count")
    .eq("analysis_id", analysisId)
    .eq("author_id", user.id)
    .limit(1);

  const row = rows?.[0];
  return row ? { postId: row.post_id, commentCount: row.comment_count } : null;
}

/**
 * Mapa analysisId → post de comunidad, para todos los análisis publicados por el
 * usuario actual. Se usa en el historial para marcar qué looks ya están en la
 * comunidad y linkear a sus comentarios en una sola consulta.
 */
export async function getPostRefsForUser(): Promise<Map<string, AnalysisPostRef>> {
  const refs = new Map<string, AnalysisPostRef>();

  if (isDemoMode()) {
    for (const p of getDemoStore().posts.values()) {
      refs.set(p.analysisId, { postId: p.id, commentCount: p.comments.length });
    }
    for (const p of DEMO_COMMUNITY_POSTS) {
      if (!refs.has(p.analysis_id)) refs.set(p.analysis_id, { postId: p.post_id, commentCount: p.comment_count });
    }
    return refs;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return refs;

  const { data: rows } = await supabase
    .from("community_feed_view")
    .select("post_id, analysis_id, comment_count")
    .eq("author_id", user.id);

  for (const r of rows ?? []) {
    refs.set(r.analysis_id, { postId: r.post_id, commentCount: r.comment_count });
  }
  return refs;
}
