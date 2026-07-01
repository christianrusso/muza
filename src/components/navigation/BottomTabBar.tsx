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

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link key={tab.href} href={tab.href} className={`tab ${active ? "active" : ""}`}>
            <MaterialIcon name={tab.icon} filled={active} />
            <span className="lbl">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
