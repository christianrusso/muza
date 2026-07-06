import { format, parseISO } from "date-fns";
import { getAdminMetrics, type AdminMetrics } from "@/lib/admin/metrics";

// Las métricas se leen siempre frescas en cada visita al panel.
export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-faint">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-serif text-4xl text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

function BarList({
  rows,
  empty,
}: {
  rows: { label: string; value: number }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-faint">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-ink" title={r.label}>
            {r.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-paper">
            <div
              className="h-full rounded-md bg-coral/80"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted">
            {fmt(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DayBars({ data, empty }: { data: { day: string; count: number }[]; empty: string }) {
  if (data.length === 0) return <p className="text-sm text-faint">{empty}</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  // Track de altura fija en px: la altura en % de la barra resuelve contra un
  // contenedor de altura definida (evita el bug de % dentro de flex items-end).
  return (
    <div className="flex items-end gap-1.5">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-end" style={{ height: 100 }}>
            <div
              className="w-full rounded-t bg-coral/70"
              style={{ height: `${d.count === 0 ? 0 : Math.max((d.count / max) * 100, 4)}%` }}
              title={`${format(parseISO(d.day), "dd/MM")}: ${d.count}`}
            />
          </div>
          <span className="text-[10px] text-faint">{format(parseISO(d.day), "dd/MM")}</span>
        </div>
      ))}
    </div>
  );
}

function FunnelRow({ label, value, base }: { label: string; value: number; base: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-48 shrink-0 text-sm text-ink">{label}</span>
      <div className="h-7 flex-1 overflow-hidden rounded-md bg-paper">
        <div
          className="flex h-full items-center rounded-md bg-coral/80 px-2"
          style={{ width: `${base ? Math.max((value / base) * 100, 6) : 0}%` }}
        >
          <span className="text-xs font-semibold text-white">{fmt(value)}</span>
        </div>
      </div>
      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-muted">
        {pct(value, base)}
      </span>
    </div>
  );
}

function Dashboard({ m }: { m: AdminMetrics }) {
  return (
    <>
      <p className="mb-6 text-xs text-faint">
        Actualizado: {format(parseISO(m.generated_at), "dd/MM/yyyy HH:mm")}
      </p>

      <Section title="Usuarios">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Registrados" value={fmt(m.users.total)} />
          <StatCard label="Nuevos (7d)" value={fmt(m.users.new_7d)} />
          <StatCard label="Nuevos (30d)" value={fmt(m.users.new_30d)} />
          <StatCard label="Pro" value={fmt(m.users.pro)} />
          <StatCard label="Free" value={fmt(m.users.free)} />
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <p className="mb-3 text-sm text-muted">Registros por día (últimos 14)</p>
          <DayBars data={m.signups_by_day} empty="Sin registros en el período." />
        </div>
      </Section>

      <Section title="Actividad (scores)">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Análisis totales" value={fmt(m.analyses.total)} />
          <StatCard label="Válidos" value={fmt(m.analyses.valid)} />
          <StatCard
            label="Usuarios con score"
            value={fmt(m.analyses.distinct_users)}
            hint={`${pct(m.analyses.distinct_users, m.users.total)} de los registrados`}
          />
          <StatCard label="Score promedio" value={fmt(m.analyses.avg_score)} />
          <StatCard
            label="Pendientes / inválidos"
            value={`${fmt(m.analyses.pending)} / ${fmt(m.analyses.invalid)}`}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="mb-3 text-sm text-muted">Análisis por día (últimos 14)</p>
            <DayBars data={m.analyses_by_day} empty="Sin análisis en el período." />
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <p className="mb-3 text-sm text-muted">Por ocasión</p>
            <BarList
              rows={m.by_occasion.map((o) => ({ label: o.occasion, value: o.count }))}
              empty="Sin datos."
            />
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <p className="mb-3 text-sm text-muted">Top usuarios por cantidad de scores</p>
          <BarList
            rows={m.top_users.map((u) => ({ label: u.name, value: u.count }))}
            empty="Sin datos."
          />
        </div>
      </Section>

      <Section title="Comunidad">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Posts" value={fmt(m.community.posts)} />
          <StatCard label="Reacciones" value={fmt(m.community.reactions)} />
          <StatCard label="Comentarios" value={fmt(m.community.comments)} />
          <StatCard label="Follows" value={fmt(m.community.follows)} />
          <StatCard
            label="Publicaron"
            value={fmt(m.community.distinct_posters)}
            hint={`${pct(m.community.distinct_posters, m.users.total)} de los registrados`}
          />
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <p className="mb-3 text-sm text-muted">Top posts por likes</p>
          {m.top_posts.length === 0 ? (
            <p className="text-sm text-faint">Todavía no hay posts.</p>
          ) : (
            <ul className="divide-y divide-line">
              {m.top_posts.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">
                      {p.caption?.trim() || <span className="text-faint">(sin texto)</span>}
                    </p>
                    <p className="text-xs text-faint">
                      {p.name} · {format(parseISO(p.created_at), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-coral">
                    ♥ {fmt(p.likes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Embudo de activación">
        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="space-y-3">
            <FunnelRow label="Registrados" value={m.users.total} base={m.users.total} />
            <FunnelRow
              label="Hicieron ≥1 score"
              value={m.analyses.distinct_users}
              base={m.users.total}
            />
            <FunnelRow
              label="Publicaron en comunidad"
              value={m.community.distinct_posters}
              base={m.users.total}
            />
          </div>
        </div>
      </Section>
    </>
  );
}

export default async function AdminPage() {
  let metrics: AdminMetrics | null = null;
  let error: string | null = null;
  try {
    metrics = await getAdminMetrics();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido.";
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-serif text-2xl text-ink">No se pudieron cargar las métricas</h2>
        <p className="mt-2 text-sm text-muted">
          Verificá que la función SQL exista corriendo la migración{" "}
          <code className="rounded bg-paper px-1 py-0.5">0014_admin_metrics.sql</code> con{" "}
          <code className="rounded bg-paper px-1 py-0.5">supabase db push</code>, y que{" "}
          <code className="rounded bg-paper px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> esté
          configurada.
        </p>
        <p className="mt-3 rounded-lg bg-red-soft px-3 py-2 text-xs text-red">{error}</p>
      </div>
    );
  }

  return <Dashboard m={metrics} />;
}
