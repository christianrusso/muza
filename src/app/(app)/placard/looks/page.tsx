import Link from "next/link";
import { ScreenHead } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { LOOKS, gradientStyle } from "@/lib/placard/mock";

export default function MyLooksPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="flex-1 overflow-y-auto px-[22px] pb-[130px] pt-[60px]">
        <ScreenHead title="Mis looks" backHref="/placard" />

        <div className="grid grid-cols-2 gap-4">
          {LOOKS.map((look) => (
            <Link key={look.id} href={`/placard/look/${look.id}`} className="flex flex-col gap-2">
              <div
                className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl"
                style={{ background: gradientStyle(look.grad) }}
              >
                <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-extrabold text-[var(--violet)]">
                  <MaterialIcon name="auto_awesome" size={12} />
                  IA
                </span>
                <MaterialIcon name="checkroom" size={72} className="text-white/25" />
              </div>
              <div className="flex flex-col px-0.5">
                <span className="text-[15px] font-bold leading-tight text-ink">{look.title}</span>
                <span className="text-xs font-semibold text-faint">{look.when}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bottom-cta">
        <Link href="/placard/look/new" className="btn btn-violet">
          <MaterialIcon name="auto_awesome" size={20} />
          Armá un look nuevo
        </Link>
      </div>
    </div>
  );
}
