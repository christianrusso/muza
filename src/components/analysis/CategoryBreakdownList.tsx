import { categoryLabel, scoreBandColorVar } from "@/lib/scoring/categories";
import type { AnalysisCategoryRow } from "@/types/domain";

export function CategoryBreakdownList({ categories }: { categories: AnalysisCategoryRow[] }) {
  return (
    <div className="flex flex-col gap-[15px]">
      {categories.map((cat) => {
        const color = scoreBandColorVar(cat.score);
        return (
          <div key={cat.categoryKey}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[13px] font-bold">{categoryLabel(cat.categoryKey)}</span>
              <span className="text-[13px] font-extrabold" style={{ color }}>
                {cat.score}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${cat.score}%`, background: color }} />
            </div>
            {cat.justification && (
              <p className="just mt-1.5 text-xs font-semibold leading-[1.45] text-muted">
                {cat.justification}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
