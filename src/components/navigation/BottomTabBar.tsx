"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGuestGate, type GuestAction } from "@/components/community/GuestGate";
import { Logo } from "@/components/brand/Logo";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

// `guestAction` = qué muro abrir si el que toca es un invitado. Home y Comunidad
// son navegables sin cuenta (el invitado mira y el muro salta recién al actuar).
// Historial y Perfil son personales y no tendrían nada que mostrar, así que ahí
// el muro reemplaza a la navegación: rebotar contra el middleware hasta /welcome
// lo sacaría de la app de golpe.
const TABS: {
  href: string;
  icon: string;
  label: string;
  guestAction: GuestAction | null;
}[] = [
  { href: "/home", icon: "home", label: "Home", guestAction: null },
  { href: "/history", icon: "grid_view", label: "Historial", guestAction: "history" },
  { href: "/community", icon: "groups", label: "Comunidad", guestAction: null },
  { href: "/profile", icon: "person", label: "Perfil", guestAction: "profile" },
];

const CENTER_LABEL = "Nuevo análisis";

export function BottomTabBar({ communityBadge = 0 }: { communityBadge?: number }) {
  const pathname = usePathname();
  const { isAuthed, requireAuth } = useGuestGate();

  function tab(tab: (typeof TABS)[number]) {
    const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    const showBadge = tab.href === "/community" && communityBadge > 0;
    const className = `tab ${active ? "active" : ""}`;
    const inner = (
      <>
        <span className="relative">
          <MaterialIcon name={tab.icon} filled={active} />
          {showBadge && (
            <span className="absolute -right-2 -top-1 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-paper" />
          )}
        </span>
        <span className="lbl">{tab.label}</span>
      </>
    );

    if (!isAuthed && tab.guestAction) {
      const action = tab.guestAction;
      return (
        <button key={tab.href} type="button" className={className} onClick={() => requireAuth(action)}>
          {inner}
        </button>
      );
    }

    return (
      <Link key={tab.href} href={tab.href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <nav className="tabbar">
      {TABS.slice(0, 2).map(tab)}

      {/* Acción principal de la app: elegir ocasión y sacarse la foto. Al
          invitado le abre el muro en vez de llevarlo a /analysis/new (privada). */}
      {isAuthed ? (
        <Link href="/analysis/new" className="tab-center" aria-label={CENTER_LABEL}>
          <Logo size={62} />
        </Link>
      ) : (
        <button
          type="button"
          className="tab-center"
          aria-label={CENTER_LABEL}
          onClick={() => requireAuth("score")}
        >
          <Logo size={62} />
        </button>
      )}

      {TABS.slice(2).map(tab)}
    </nav>
  );
}
