"use client";

import Link from "next/link";
import { useGuestGate } from "@/components/community/GuestGate";

/**
 * Link al perfil de un autor. Al invitado le abre el muro en vez de navegar:
 * /community/user/<id> es privada, y el perfil muestra el portfolio de looks con
 * sus scores — o sea que dejarlo entrar le permitiría saltearse el juego del
 * deck ("adiviná el score") sin votar.
 */
export function AuthorLink({
  userId,
  className,
  children,
}: {
  userId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { isAuthed, requireAuth } = useGuestGate();

  if (!isAuthed) {
    return (
      <button type="button" className={className} onClick={() => requireAuth("author")}>
        {children}
      </button>
    );
  }

  return (
    <Link href={`/community/user/${userId}`} className={className}>
      {children}
    </Link>
  );
}
