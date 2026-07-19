"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ColorimetryOutfitGroup } from "@/types/colorimetry";

export function OutfitGroupTabs({ groups }: { groups: ColorimetryOutfitGroup[] }) {
  const [activeId, setActiveId] = useState(groups[0]?.id);
  const active = groups.find((g) => g.id === activeId) ?? groups[0];

  return (
    <>
      <div className="-mx-[22px] mb-3.5 flex gap-2.5 overflow-x-auto px-[22px]">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveId(group.id)}
            className={cn("chip", group.id === active?.id && "active")}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Placeholders: las prendas todavía no se generan como imagen. */}
      <div className="flex gap-3">
        {active?.items.map((item) => (
          <div
            key={item}
            className="ph relative flex aspect-square flex-1 items-end rounded-[18px] p-3"
          >
            <span className="text-[15px] font-semibold text-white/75">{item}</span>
          </div>
        ))}
      </div>
    </>
  );
}
