"use client";

import { useEffect } from "react";

// Al montar la pantalla de Actividad, marca todo como visto para limpiar el
// badge de novedades. Fire-and-forget: no bloquea el render.
export function MarkActivitySeen() {
  useEffect(() => {
    fetch("/api/community/activity/seen", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
