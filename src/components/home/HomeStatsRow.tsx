import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { scoreBandColorVar } from "@/lib/scoring/categories";

export function HomeStatsRow({ average, totalCount }: { average: number | null; totalCount: number }) {
  return (
    <div className="flex gap-3">
      <div className="card flex-1 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="section-label">Promedio histórico</span>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{
              background: average !== null ? `color-mix(in srgb, ${scoreBandColorVar(average)} 16%, white)` : "var(--paper)",
              color: average !== null ? scoreBandColorVar(average) : "var(--faint)",
            }}
          >
            <MaterialIcon name="trending_up" size={16} />
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[30px] font-extrabold"
            style={{ color: average !== null ? scoreBandColorVar(average) : "var(--ink)" }}
          >
            {average ?? "—"}
          </span>
        </div>
      </div>
      <div className="card flex-1 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="section-label">Análisis</span>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: "var(--violet-soft)", color: "var(--violet)" }}
          >
            <MaterialIcon name="styler" size={16} />
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[30px] font-extrabold">{totalCount}</span>
          <span className="text-[11px] font-bold text-faint">en total</span>
        </div>
      </div>
    </div>
  );
}
