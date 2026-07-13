"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export function SessionActions() {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleLogout() {
    try {
      posthog.capture("user_logged_out");
      posthog.reset();
    } catch {
      // never break the flow for analytics
    }
    if (!DEMO_MODE) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/welcome");
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      if (!DEMO_MODE) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      router.push("/welcome");
    }
    setDeleting(false);
  }

  return (
    <div className="list-card">
      <button type="button" onClick={handleLogout} className="row w-full text-left">
        <MaterialIcon name="logout" />
        <span className="txt">Cerrar sesión</span>
      </button>
      {confirmingDelete ? (
        <div className="row flex-col items-stretch gap-2">
          <span className="text-sm font-semibold text-[var(--red)]">
            ¿Seguro que querés eliminar tu cuenta? Esta acción no se puede deshacer.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-xl bg-[var(--red)] py-2 text-sm font-bold text-white"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="flex-1 rounded-xl border border-line-strong py-2 text-sm font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="row w-full text-left"
        >
          <MaterialIcon name="delete" className="text-[var(--red)]" />
          <span className="txt text-[var(--red)]">Eliminar cuenta</span>
        </button>
      )}
    </div>
  );
}
