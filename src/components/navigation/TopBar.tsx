"use client";

import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="back"
      onClick={() => (href ? router.push(href) : router.back())}
      aria-label="Volver"
    >
      <MaterialIcon name="chevron_left" size={22} />
    </button>
  );
}

export function ScreenHead({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <div className="screen-head">
      <BackButton href={backHref} />
      <span className="font-serif" style={{ fontSize: 27 }}>
        {title}
      </span>
    </div>
  );
}
