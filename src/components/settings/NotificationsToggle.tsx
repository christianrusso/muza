"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MODE } from "@/lib/demoClient";
import { Toggle } from "@/components/ui/Toggle";

export function NotificationsToggle({ initialOn, userId }: { initialOn: boolean; userId: string }) {
  const [on, setOn] = useState(initialOn);

  async function handleChange(next: boolean) {
    setOn(next);
    if (DEMO_MODE) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ notifications_enabled: next }).eq("id", userId);
  }

  return <Toggle on={on} onChange={handleChange} aria-label="Notificaciones" />;
}
