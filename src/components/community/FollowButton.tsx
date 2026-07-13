"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

// Botón seguir/dejar de seguir. Optimista: cambia al instante y revierte si el
// POST falla. "Seguir" = pill coral; "Siguiendo ✓" = outline coral.
export function FollowButton({
  userId,
  initialFollowing,
  size = "md",
}: {
  userId: string;
  initialFollowing: boolean;
  size?: "md" | "sm";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !following;
    setFollowing(next);
    setPending(true);
    try {
      const res = await fetch(`/api/community/users/${userId}/follow`, { method: "POST" });
      if (!res.ok) throw new Error("follow failed");
      const data = (await res.json()) as { following: boolean };
      setFollowing(data.following);
      if (data.following) {
        track("followed", { target_user_id: userId });
      }
    } catch {
      setFollowing(!next); // revertir
    } finally {
      setPending(false);
    }
  }

  const pad = size === "sm" ? "h-9 px-4 text-[13px]" : "h-11 px-6 text-sm";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-full font-extrabold transition-colors ${pad} ${
        following
          ? "border-2 border-coral bg-transparent text-coral"
          : "border-2 border-coral bg-coral text-white"
      }`}
    >
      {following ? "Siguiendo ✓" : "Seguir"}
    </button>
  );
}
