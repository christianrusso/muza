"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";

export function PublishButton({ analysisId }: { analysisId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handlePublish() {
    setSubmitting(true);
    const res = await fetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId }),
    });
    setSubmitting(false);
    if (res.ok) {
      track("published", { analysis_id: analysisId });
      router.push("/community");
    }
  }

  return (
    <Button style={{ width: 100, height: 40, fontSize: 13 }} onClick={handlePublish} disabled={submitting}>
      {submitting ? "..." : "Publicar"}
    </Button>
  );
}
