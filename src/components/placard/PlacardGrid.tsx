"use client";

import { useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { GarmentCard } from "@/components/placard/GarmentCard";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  GARMENTS,
  categoryCount,
  garmentsByCategory,
  type GarmentCategory,
} from "@/lib/placard/mock";

export function PlacardGrid() {
  const [active, setActive] = useState<GarmentCategory | "all">("all");
  const visible = garmentsByCategory(active);

  return (
    <div className="screen-body pad-tab" style={{ gap: 18 }}>
      <div className="flex items-center justify-between">
        <span className="font-serif italic leading-tight text-ink" style={{ fontSize: 34 }}>
          Mi placard
        </span>
        {/* El avatar entra al perfil, igual que en Home. */}
        <Link
          href="/profile"
          aria-label="Ver perfil"
          className="ph h-[46px] w-[46px] flex-none rounded-full border-2 border-white"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,.08)" }}
        />
      </div>

      {/* Dos accesos principales: cargar ropa y armar un look con la que ya hay. */}
      <div className="flex gap-3">
        <Link href="/placard/add" className="card flex flex-1 items-center gap-3 p-3.5">
          <span
            className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-2xl"
            style={{ background: "var(--violet-soft)" }}
          >
            <MaterialIcon name="add" size={26} className="text-[var(--violet)]" />
          </span>
          <span className="flex flex-col">
            <span className="text-[17px] font-extrabold leading-tight text-ink">Agregar prenda</span>
            <span className="text-xs font-semibold text-faint">Subí o detectá</span>
          </span>
        </Link>

        <Link
          href="/placard/look/new"
          className="flex flex-1 items-center gap-3 rounded-[20px] p-3.5"
          style={{ background: "var(--violet)" }}
        >
          <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-2xl bg-white/20">
            <MaterialIcon name="auto_awesome" size={24} className="text-white" />
          </span>
          <span className="flex flex-col">
            <span className="text-[17px] font-extrabold leading-tight text-white">Armá tu look</span>
            <span className="text-xs font-semibold text-white/80">Con tu ropa</span>
          </span>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <span className="section-label">Prendas · {GARMENTS.length}</span>
        <Link
          href="/placard/looks"
          className="flex items-center gap-1.5 text-sm font-bold"
          style={{ color: "var(--violet)" }}
        >
          <MaterialIcon name="auto_awesome" size={16} />
          Mis looks
        </Link>
      </div>

      <div className="-mx-[22px] flex gap-2 overflow-x-auto px-[22px]">
        <button
          type="button"
          className={`chip ${active === "all" ? "active" : ""}`}
          onClick={() => setActive("all")}
        >
          Todo
        </button>
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`chip ${active === cat ? "active" : ""}`}
            onClick={() => setActive(cat)}
          >
            {CATEGORY_LABEL[cat]} · {categoryCount(cat)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 pb-[110px]">
        {visible.map((g) => (
          <GarmentCard key={g.id} garment={g} />
        ))}
      </div>
    </div>
  );
}
