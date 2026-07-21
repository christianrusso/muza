"use client";

import { useState } from "react";
import { CategoryBreakdownList } from "./CategoryBreakdownList";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { AnalysisCategoryRow } from "@/types/domain";

// El desglose por categoría vive al final del resultado y arranca desplegado. El
// borde superior hace de separador con las recomendaciones; el chevron permite
// colapsarlo para achicar la lista.
export function CategoryBreakdownSection({ categories }: { categories: AnalysisCategoryRow[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-[26px] border-t pt-[22px]" style={{ borderColor: "var(--line-strong)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-1"
        aria-expanded={open}
      >
        <span className="section-label">Desglose por categoría</span>
        <MaterialIcon name={open ? "expand_less" : "expand_more"} size={22} className="text-muted" />
      </button>
      {open && (
        <div className="mt-4">
          <CategoryBreakdownList categories={categories} />
        </div>
      )}
    </div>
  );
}
