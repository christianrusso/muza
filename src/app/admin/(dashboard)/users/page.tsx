import { format, parseISO } from "date-fns";
import Link from "next/link";
import { getAdminUsers, type AdminUser } from "@/lib/admin/users";
import { BlockButton } from "./BlockButton";

// Igual que las métricas: siempre fresco, nunca cacheado.
export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

function date(value: string | null): string {
  return value ? format(parseISO(value), "dd/MM/yy") : "—";
}

function Num({ value }: { value: number }) {
  return (
    <td className="px-3 py-3 text-right text-sm tabular-nums text-muted">
      {value === 0 ? <span className="text-faint">0</span> : fmt(value)}
    </td>
  );
}

function UserRow({ u }: { u: AdminUser }) {
  // La columna del nombre queda fija al scrollear horizontal, así que necesita
  // un fondo OPACO propio o las celdas de abajo se le transparentan encima.
  // Por eso el color de la fila se aplica a los dos, y sólido (nada de /30).
  const rowBg = u.blocked_at ? "bg-red-soft" : "bg-card";
  return (
    <tr className={rowBg}>
      <td className={`sticky left-0 z-10 ${rowBg} px-3 py-3`}>
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
              <Link
                href={`/admin/users/${u.id}`}
                className="truncate underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                title={`Ver detalle y fotos de ${u.full_name}`}
              >
                {u.full_name}
              </Link>
              {u.blocked_at && (
                <span
                  className="shrink-0 rounded bg-red px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white"
                  title={`Bloqueado el ${format(parseISO(u.blocked_at), "dd/MM/yyyy HH:mm")}`}
                >
                  Bloqueado
                </span>
              )}
            </p>
            <p className="truncate text-xs text-faint" title={u.email ?? ""}>
              {u.email ?? "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span
          className={
            u.plan_tier === "pro"
              ? "rounded bg-coral/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-coral"
              : "text-xs text-faint"
          }
        >
          {u.plan_tier}
        </span>
      </td>
      <td className="px-3 py-3 text-sm text-muted">{date(u.created_at)}</td>
      <Num value={u.analyses} />
      <td className="px-3 py-3 text-right text-sm tabular-nums text-muted">
        {u.avg_score ?? <span className="text-faint">—</span>}
      </td>
      <Num value={u.posts} />
      <Num value={u.comments} />
      <Num value={u.votes} />
      <Num value={u.votes_received} />
      <Num value={u.likes_received} />
      <Num value={u.followers} />
      <td className="px-3 py-3 text-sm text-muted">{date(u.last_analysis_at)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-faint">
        ${Number(u.ai_cost_usd).toFixed(2)}
      </td>
      <td className="px-3 py-3">
        <BlockButton userId={u.id} name={u.full_name} blocked={Boolean(u.blocked_at)} />
      </td>
    </tr>
  );
}

function Th({
  children,
  right,
  sticky,
}: {
  children: React.ReactNode;
  right?: boolean;
  sticky?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-faint ${
        right ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 z-20 bg-card" : ""}`}
    >
      {children}
    </th>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q ?? "";

  let users: AdminUser[] = [];
  let error: string | null = null;
  try {
    users = await getAdminUsers(q);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido.";
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-serif text-2xl text-ink">No se pudieron cargar los usuarios</h2>
        <p className="mt-2 text-sm text-muted">
          Verificá que la migración{" "}
          <code className="rounded bg-paper px-1 py-0.5">0019_admin_users.sql</code> esté aplicada
          con <code className="rounded bg-paper px-1 py-0.5">supabase db push</code>.
        </p>
        <p className="mt-3 rounded-lg bg-red-soft px-3 py-2 text-xs text-red">{error}</p>
      </div>
    );
  }

  const blocked = users.filter((u) => u.blocked_at).length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        {/* Form GET: el filtro vive en la URL, así el estado sobrevive al
            router.refresh() de bloquear/desbloquear y es compartible. */}
        <form method="GET" className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o email…"
            className="w-72 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-line-strong focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-muted transition hover:text-ink"
          >
            Buscar
          </button>
          {q && (
            <Link href="/admin/users" className="text-xs text-faint underline hover:text-muted">
              Limpiar
            </Link>
          )}
        </form>
        <p className="text-xs text-faint">
          {fmt(users.length)} usuario{users.length === 1 ? "" : "s"}
          {blocked > 0 && ` · ${fmt(blocked)} bloqueado${blocked === 1 ? "" : "s"}`}
          {q && " (filtrados)"}
        </p>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-10 text-center">
          <p className="text-sm text-faint">
            {q ? `Ningún usuario coincide con "${q}".` : "Todavía no hay usuarios."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead className="border-b border-line">
              <tr>
                <Th sticky>Usuario</Th>
                <Th>Plan</Th>
                <Th>Registro</Th>
                <Th right>Fotos</Th>
                <Th right>Score</Th>
                <Th right>Posts</Th>
                <Th right>Coment.</Th>
                <Th right>Votos emit.</Th>
                <Th right>Votos recib.</Th>
                <Th right>♥ recib.</Th>
                <Th right>Seguid.</Th>
                <Th>Últ. foto</Th>
                <Th right>Costo IA</Th>
                <Th right>Acción</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <UserRow key={u.id} u={u} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
