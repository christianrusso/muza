"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlockedUser } from "@/lib/community/blocks";

export function BlockedUsersList({ initialUsers }: { initialUsers: BlockedUser[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function unblock(userId: string) {
    if (busyId) return;
    setBusyId(userId);
    setError(null);
    try {
      const response = await fetch(`/api/community/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: false }),
      });
      if (!response.ok) throw new Error("unblock failed");
      setUsers((current) => current.filter((user) => user.userId !== userId));
      router.refresh();
    } catch {
      setError("No se pudo desbloquear. Probá de nuevo.");
    } finally {
      setBusyId(null);
    }
  }

  if (users.length === 0) {
    return <p className="py-16 text-center text-sm font-semibold text-muted">No bloqueaste a nadie.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      {users.map((user) => (
        <div key={user.userId} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="ph h-11 w-11 rounded-full" />
          )}
          <span className="flex-1 text-sm font-extrabold text-ink">{user.name}</span>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => unblock(user.userId)}
            className="rounded-full border-2 border-coral px-3 py-2 text-xs font-extrabold text-coral disabled:opacity-60"
          >
            {busyId === user.userId ? "..." : "Desbloquear"}
          </button>
        </div>
      ))}
    </div>
  );
}
