import { format, parseISO } from "date-fns";
import Link from "next/link";
import { listCommentReports, type AdminCommentReport } from "@/lib/admin/commentReports";
import { ResolveReportButton } from "./ResolveReportButton";

export const dynamic = "force-dynamic";

export default async function AdminCommentReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const query = await searchParams;
  let result: Awaited<ReturnType<typeof listCommentReports>> = { data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } };
  let error: string | null = null;
  try { result = await listCommentReports({ status: query.status || "pending", category: query.category }); } catch (e) { error = e instanceof Error ? e.message : "Error desconocido."; }
  if (error) return <div className="rounded-2xl border border-line bg-card p-6"><h1 className="font-serif text-2xl">No se pudieron cargar los reportes</h1><p className="mt-2 text-sm text-red">{error}</p></div>;
  return <>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div><h1 className="font-serif text-3xl text-ink">Reportes</h1><p className="mt-1 text-sm text-muted">Revisá comentarios reportados por la comunidad.</p></div>
      <form className="flex gap-2"><select name="status" defaultValue={query.status || "pending"} className="rounded-lg border border-line bg-card px-3 py-2 text-sm"><option value="pending">Pendientes</option><option value="confirmed">Confirmados</option><option value="dismissed">Descartados</option><option value="all">Todos</option></select><input name="category" defaultValue={query.category || ""} placeholder="slug de categoría" className="w-44 rounded-lg border border-line bg-card px-3 py-2 text-sm" /><button className="rounded-lg bg-ink px-3 py-2 text-sm font-bold text-white">Filtrar</button></form>
    </div>
    <div className="flex flex-col gap-3">{result.data.length === 0 ? <div className="rounded-2xl border border-line bg-card p-10 text-center text-sm text-faint">No hay reportes con estos filtros.</div> : result.data.map((r: AdminCommentReport) => <article key={r.id} className="rounded-2xl border border-line bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-widest text-coral">{r.category.label}</span><p className="mt-2 text-sm font-semibold text-ink">“{r.comment?.body ?? r.commentSnapshot.body}”</p><p className="mt-1 text-xs text-muted">Autor: {r.comment?.authorName ?? r.commentSnapshot.authorName} · Reportó: {r.reporter.name}</p><p className="mt-1 text-xs text-faint">{format(parseISO(r.createdAt), "dd/MM/yyyy HH:mm")}</p><Link href={`/admin/users/${r.comment?.authorId ?? ""}`} className="mt-2 inline-block text-xs font-bold text-coral underline">Ver usuario y bloqueo</Link></div><ResolveReportButton id={r.id} status={r.status} /></div>{r.observations && <p className="mt-3 rounded-lg bg-paper p-3 text-sm text-muted"><strong>Observaciones:</strong> {r.observations}</p>}{r.adminNotes && <p className="mt-2 text-xs text-faint">Nota admin: {r.adminNotes}</p>}</article>)}</div>
  </>;
}
