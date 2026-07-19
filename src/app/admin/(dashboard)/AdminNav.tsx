"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Métricas" },
  { href: "/admin/users", label: "Usuarios" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-lg bg-coral/10 px-3 py-1.5 text-sm font-medium text-coral"
                : "rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition hover:text-ink"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
