import { format, parseISO } from "date-fns";
import { getAdminBlockMetrics, type AdminBlockMetrics } from "@/lib/admin/blockMetrics";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-serif text-4xl text-ink">{value}</p>
    </div>
  );
}

function DayBars({ data }: { data: AdminBlockMetrics["blocks_by_day"] }) {
  const max = Math.max(...data.map((day) => day.count), 1);
  return (
    <div className="flex items-end gap-1.5">
      {data.map((day) => (
        <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-[100px] w-full items-end">
            <div
              className="w-full rounded-t bg-coral/70"
              style={{ height: day.count ? `${Math.max((day.count / max) * 100, 4)}%` : 0 }}
              title={`${format(parseISO(day.day), "dd/MM")}: ${day.count}`}
            />
          </div>
          <span className="text-[10px] text-faint">{format(parseISO(day.day), "dd/MM")}</span>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ metrics }: { metrics: AdminBlockMetrics }) {
  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-coral">Analytics</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Bloqueos</h1>
        </div>
        <p className="text-right text-xs text-faint">
          Actualizado:
          <br />
          {format(parseISO(metrics.generated_at), "dd/MM/yyyy HH:mm")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Bloqueos activos" value={fmt(metrics.active_blocks)} />
        <StatCard label="Bloqueos (7d)" value={fmt(metrics.blocks_last_7_days)} />
        <StatCard label="Bloqueos (30d)" value={fmt(metrics.blocks_last_30_days)} />
        <StatCard label="Desbloqueos (7d)" value={fmt(metrics.unblocks_last_7_days)} />
        <StatCard label="Desbloqueos (30d)" value={fmt(metrics.unblocks_last_30_days)} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-faint">Usuarios</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Usuarios que bloquearon" value={fmt(metrics.unique_blockers)} />
          <StatCard label="Bloqueados actuales" value={fmt(metrics.unique_currently_blocked_users)} />
          <StatCard label="Bloqueados históricos" value={fmt(metrics.unique_historically_blocked_users)} />
          <StatCard label="Promedio por usuario" value={metrics.average_blocks_per_blocker.toLocaleString("es-AR")} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-faint">Evolución</h2>
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="mb-3 text-sm text-muted">Bloqueos por día (últimos 14)</p>
          {metrics.blocks_by_day.length ? <DayBars data={metrics.blocks_by_day} /> : <p className="text-sm text-faint">Sin bloqueos en el período.</p>}
        </div>
      </section>
    </>
  );
}

export default async function AdminBlocksAnalyticsPage() {
  let metrics: AdminBlockMetrics | null = null;
  let error: unknown = null;
  try {
    metrics = await getAdminBlockMetrics();
  } catch (caught) {
    error = caught;
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <h1 className="font-serif text-2xl text-ink">No se pudieron cargar las métricas</h1>
        <p className="mt-2 text-sm text-red">{error instanceof Error ? error.message : "Error desconocido."}</p>
      </div>
    );
  }

  return <Dashboard metrics={metrics} />;
}
