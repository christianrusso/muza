"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OCCASIONS } from "@/lib/occasions";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { Button } from "@/components/ui/Button";

export function OccasionGrid() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-3 gap-[11px]">
        {OCCASIONS.map((occasion) => (
          <button
            key={occasion.id}
            type="button"
            className={`occ ${selected === occasion.id ? "sel" : ""}`}
            onClick={() => setSelected(occasion.id)}
          >
            <MaterialIcon name={occasion.icon} size={26} />
            <span>{occasion.label}</span>
          </button>
        ))}
      </div>
      <Button
        style={{ marginTop: "auto" }}
        disabled={!selected}
        onClick={() => router.push(`/analysis/new/capture?occasion=${selected}`)}
      >
        Continuar
      </Button>
    </>
  );
}
