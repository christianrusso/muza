"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MaterialIcon } from "@/components/brand/MaterialIcon";

export function SaveShareBar() {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Muza — Mi Outfit Score", url: window.location.href });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Enlace copiado");
    }
  }

  return (
    <div className="bottom-cta">
      {toast && (
        <p className="mb-1 text-center text-xs font-bold text-coral">{toast}</p>
      )}
      <div className="flex gap-2.5">
        <Button
          variant="outline"
          style={{ flex: 1, height: 50, fontSize: 14 }}
          onClick={handleShare}
        >
          <MaterialIcon name="ios_share" size={19} />
          Compartir
        </Button>
      </div>
    </div>
  );
}
