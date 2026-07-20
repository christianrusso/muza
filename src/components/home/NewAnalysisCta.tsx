import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export function NewAnalysisCta() {
  return (
    <Link
      href="/analysis/new"
      className="flex items-center gap-3.5 rounded-[20px] bg-coral px-[18px] py-4"
      style={{ boxShadow: "0 14px 26px -12px rgba(236,90,46,.6)" }}
    >
      <span className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-white/[.18]">
        <MaterialIcon name="photo_camera" size={26} className="text-white" />
      </span>
      <span className="flex flex-1 flex-col items-start gap-0.5">
        <span className="text-[17px] font-extrabold text-white">Nuevo análisis</span>
        <span className="text-xs font-semibold text-white/85">Sacá una foto de tu outfit</span>
      </span>
      <MaterialIcon name="arrow_forward" size={24} className="text-white" />
    </Link>
  );
}
