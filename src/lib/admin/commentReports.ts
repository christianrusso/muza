import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDemoStore, resolveDemoCommentReport } from "@/lib/demoStore";
import { isDemoMode } from "@/lib/demo";

export type AdminCommentReport = {
  id: string; commentId: string | null; category: { slug: string; label: string };
  observations: string | null; status: "pending" | "confirmed" | "dismissed";
  createdAt: string; resolvedAt: string | null; adminNotes: string | null;
  reporter: { id: string; name: string };
  comment: { body: string; authorId: string; authorName: string; createdAt: string } | null;
  commentSnapshot: { body: string; authorName: string; createdAt: string };
  post: { id: string; caption: string | null };
};

export async function listCommentReports({ status = "pending", category, page = 1, pageSize = 25 }: { status?: string; category?: string; page?: number; pageSize?: number } = {}) {
  if (isDemoMode()) {
    const all = Array.from(getDemoStore().commentReports.values()).filter((r) => (status === "all" || r.status === status) && (!category || r.category.slug === category));
    const start = (page - 1) * pageSize;
    return { data: all.slice(start, start + pageSize).map((r) => ({ id: r.id, commentId: r.commentId, category: r.category, observations: r.observations, status: r.status, createdAt: r.createdAt, resolvedAt: r.resolvedAt, adminNotes: r.adminNotes, reporter: r.reporter, comment: r.status === "confirmed" && r.commentId === null ? null : r.comment, commentSnapshot: { body: r.comment.body, authorName: r.comment.authorName, createdAt: r.comment.createdAt }, post: r.post })), pagination: { page, pageSize, total: all.length, totalPages: Math.ceil(all.length / pageSize) } };
  }
  const admin = createAdminClient();
  let query = admin.from("comment_reports").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status as "pending" | "confirmed" | "dismissed");
  if (category) {
    const { data: cat } = await admin.from("comment_report_categories").select("id").eq("slug", category).maybeSingle();
    if (!cat) return { data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
    query = query.eq("category_id", cat.id);
  }
  const { data: rows, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  const reports = rows ?? [];
  const categoryIds = [...new Set(reports.map((r) => r.category_id))];
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean) as string[])];
  const [{ data: cats }, { data: reporters }] = await Promise.all([
    admin.from("comment_report_categories").select("id, slug, label").in("id", categoryIds),
    reporterIds.length ? admin.from("profiles").select("id, full_name").in("id", reporterIds) : Promise.resolve({ data: [] }),
  ]);
  const catById = new Map((cats ?? []).map((c) => [c.id, { slug: c.slug, label: c.label }]));
  const reporterById = new Map((reporters ?? []).map((p) => [p.id, { id: p.id, name: p.full_name }]));
  const data = reports.map((r) => ({
    id: r.id, commentId: r.comment_id, category: catById.get(r.category_id) ?? { slug: "", label: "" },
    observations: r.observations, status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at, adminNotes: r.admin_notes,
    reporter: r.reporter_id ? reporterById.get(r.reporter_id) ?? { id: r.reporter_id, name: "Cuenta eliminada" } : { id: "", name: "Cuenta eliminada" },
    comment: r.comment_id ? { body: r.comment_body_snapshot, authorId: r.comment_author_id_snapshot, authorName: r.comment_author_name_snapshot, createdAt: r.comment_created_at_snapshot } : null,
    commentSnapshot: { body: r.comment_body_snapshot, authorName: r.comment_author_name_snapshot, createdAt: r.comment_created_at_snapshot },
    post: { id: r.post_id_snapshot, caption: r.post_caption_snapshot },
  }));
  return { data, pagination: { page, pageSize, total: data.length, totalPages: data.length === pageSize ? page + 1 : page } };
}

export async function resolveCommentReport(id: string, status: "confirmed" | "dismissed", adminActor: string, adminNotes: string | null) {
  if (isDemoMode()) return resolveDemoCommentReport(id, status, adminNotes);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("resolve_comment_report", { p_report_id: id, p_status: status, p_admin_actor: adminActor, p_admin_notes: adminNotes });
  if (error) throw new Error(error.message);
  return data;
}
