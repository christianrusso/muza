"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { track } from "@/lib/analytics";

export function PublishButton({
  analysisId,
  label = "Publicar",
  variant = "primary",
  className,
  buttonStyle = { width: 100, height: 40, fontSize: 13 },
  goToPost = false,
  icon,
}: {
  analysisId: string;
  label?: string;
  variant?: "primary" | "outline" | "ghost" | "light";
  className?: string;
  buttonStyle?: CSSProperties;
  // Al terminar, ir al detalle del post recién creado (para ver/compartir sus
  // comentarios) en vez de al feed general.
  goToPost?: boolean;
  // Ícono Material opcional a la izquierda del label (ej. "groups" en el CTA
  // de comunidad).
  icon?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handlePublish() {
    setSubmitting(true);
    const res = await fetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId }),
    });
    if (res.ok) {
      track("published", { analysis_id: analysisId });
      if (goToPost) {
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        router.push(data?.id ? `/community/post/${data.id}` : "/community");
      } else {
        router.push("/community");
      }
    } else {
      setSubmitting(false);
    }
  }

  return (
    <Button
      variant={variant}
      className={className}
      style={buttonStyle}
      onClick={handlePublish}
      disabled={submitting}
    >
      {submitting ? (
        "..."
      ) : (
        <>
          {icon && <MaterialIcon name={icon} size={20} />}
          {label}
        </>
      )}
    </Button>
  );
}
