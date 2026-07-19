"use client";

import Link from "next/link";
import { useGuestGate, type GuestAction } from "@/components/community/GuestGate";
import type { CommunityTab } from "@/lib/community/constants";

const TABS: { value: CommunityTab; label: string; guestAction: GuestAction | null }[] = [
  { value: "vota", label: "Votá", guestAction: null },
  { value: "siguiendo", label: "Siguiendo", guestAction: "follow" },
];

export function CommunityTabs({ activeTab }: { activeTab: CommunityTab }) {
  const { isAuthed, requireAuth } = useGuestGate();

  return (
    <div className="flex gap-5 border-b border-line px-[22px]">
      {TABS.map((t) => {
        const className = `feed-tab ${activeTab === t.value ? "active" : ""}`;

        // El invitado navega "Votá" (ve el deck, no puede votar). "Siguiendo" es
        // personalizada y sin sesión saldría vacía, así que tocarla abre el muro
        // en vez de llevarlo a una pantalla en blanco.
        if (!isAuthed && t.guestAction) {
          const action = t.guestAction;
          return (
            <button key={t.value} type="button" className={className} onClick={() => requireAuth(action)}>
              {t.label}
            </button>
          );
        }

        return (
          <Link key={t.value} href={`/community?tab=${t.value}`} className={className}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
