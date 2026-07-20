import { MaterialIcon } from "@/components/brand/MaterialIcon";

// Lo que ve un usuario normal mientras el Placard sigue mockeado. Las cuentas de
// la allowlist (PLACARD_TESTERS) ven la grilla real en su lugar. Ver
// lib/placard/access.ts.
export function PlacardComingSoon() {
  return (
    <div className="screen-body pad-tab" style={{ gap: 18 }}>
      <div className="flex flex-col gap-0.5">
        <span className="section-label">Tu guardarropa</span>
        <span className="font-serif italic leading-tight text-ink" style={{ fontSize: 32 }}>
          Placard
        </span>
      </div>

      <div className="card flex flex-col items-center gap-4 px-6 py-10 text-center">
        <span
          className="flex h-[64px] w-[64px] flex-none items-center justify-center rounded-2xl"
          style={{ background: "var(--violet-soft)" }}
        >
          <MaterialIcon name="checkroom" size={34} className="text-[var(--violet)]" />
        </span>
        <div className="flex flex-col gap-1.5">
          <span className="text-[19px] font-extrabold text-ink">Tu placard, en un solo lugar</span>
          <span className="text-sm font-semibold text-muted">
            Guardá tus prendas y armá outfits sin sacar la foto cada vez. Estamos preparándolo.
          </span>
        </div>
        <span
          className="flex flex-none items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide"
          style={{ background: "var(--violet-soft)", color: "var(--violet)" }}
        >
          <MaterialIcon name="lock" size={13} />
          Próximamente
        </span>
      </div>
    </div>
  );
}
