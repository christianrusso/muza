"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

const TABS = [
  { href: "/home", icon: "home", label: "Home" },
  { href: "/history", icon: "grid_view", label: "Historial" },
  { href: "/community", icon: "groups", label: "Comunidad" },
  { href: "/profile", icon: "person", label: "Perfil" },
] as const;

export function BottomTabBar({ communityBadge = 0 }: { communityBadge?: number }) {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const showBadge = tab.href === "/community" && communityBadge > 0;
        return (
          <Link key={tab.href} href={tab.href} className={`tab ${active ? "active" : ""}`}>
            <span className="relative">
              <MaterialIcon name={tab.icon} filled={active} />
              {showBadge && (
                <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-paper" />
              )}
            </span>
            <span className="lbl">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
