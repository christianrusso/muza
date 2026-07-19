import { format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ADMIN_DETAIL_PHOTO_LIMIT, getAdminUserDetail } from "@/lib/admin/users";
import { BlockButton } from "../BlockButton";
import { PhotoGrid } from "./PhotoGrid";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-serif text-2xl text-ink">{value}</p>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let detail: Awaited<ReturnType<typeof getAdminUserDetail>> = null;
  let error: string | null = null;
  try {
    detail = await getAdminUserDetail(id);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido.";
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-serif text-2xl text-ink">No se pudo cargar el usuario</h2>
        <p className="mt-2 text-sm text-muted">
          Verificá que la migración{" "}
          <code className="rounded bg-paper px-1 py-0.5">0020_admin_user_detail.sql</code> esté
          aplicada.
        </p>
        <p className="mt-3 rounded-lg bg-red-soft px-3 py-2 text-xs text-red">{error}</p>
      </div>
    );
  }

  if (!detail) notFound();

  const { user: u, analyses } = detail;

  return (
    <>
      <Link href="/admin/users" className="text-xs text-faint underline hover:text-muted">
        ← Volver a usuarios
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-serif text-3xl text-ink">
            {u.full_name}
            {u.blocked_at && (
              <span className="rounded bg-red px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
                Bloqueado
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">{u.email ?? "—"}</p>
          <p className="mt-0.5 text-xs text-faint">
            Registrado el {format(parseISO(u.created_at), "dd/MM/yyyy")} · plan {u.plan_tier}
            {u.gender && ` · ${u.gender}`}
            {u.last_sign_in_at &&
              ` · último ingreso ${format(parseISO(u.last_sign_in_at), "dd/MM/yyyy HH:mm")}`}
          </p>
          {u.blocked_at && (
            <p className="mt-1 text-xs text-red">
              Bloqueado el {format(parseISO(u.blocked_at), "dd/MM/yyyy HH:mm")}
            </p>
          )}
        </div>
        <BlockButton userId={u.id} name={u.full_name} blocked={Boolean(u.blocked_at)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Fotos" value={fmt(u.analyses)} />
        <Stat label="Score prom." value={u.avg_score === null ? "—" : fmt(u.avg_score)} />
        <Stat label="Posts" value={fmt(u.posts)} />
        <Stat label="Comentarios" value={fmt(u.comments)} />
        <Stat label="Votos" value={fmt(u.votes)} />
        <Stat label="♥ recibidos" value={fmt(u.likes_received)} />
        <Stat label="Seguidores" value={fmt(u.followers)} />
      </div>

      <h2 className="mb-4 mt-10 text-sm font-semibold uppercase tracking-widest text-faint">
        Fotos
        {u.analyses > ADMIN_DETAIL_PHOTO_LIMIT && (
          <span className="ml-2 normal-case tracking-normal text-faint">
            (las {ADMIN_DETAIL_PHOTO_LIMIT} más recientes de {fmt(u.analyses)})
          </span>
        )}
      </h2>
      <PhotoGrid analyses={analyses} />
    </>
  );
}
