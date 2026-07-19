"use client";

import Link from "next/link";
import { useGuestGate } from "@/components/community/GuestGate";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

/**
 * FAB de "Publicar". Al invitado se lo mostramos igual —es la invitación más
 * directa a tener cuenta— pero lo manda al muro en vez de a /community/publish,
 * que es privada.
 */
export function PublishFab() {
  const { isAuthed, requireAuth } = useGuestGate();

  if (!isAuthed) {
    return (
      <button type="button" className="fab" onClick={() => requireAuth("publish")}>
        <MaterialIcon name="add_a_photo" />
        Publicar
      </button>
    );
  }

  return (
    <Link href="/community/publish" className="fab">
      <MaterialIcon name="add_a_photo" />
      Publicar
    </Link>
  );
}
