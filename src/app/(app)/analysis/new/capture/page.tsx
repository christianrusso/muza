"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CameraCapture } from "@/components/analysis/CameraCapture";
import type { OccasionId } from "@/types/domain";

function CaptureContent() {
  const searchParams = useSearchParams();
  const occasionId = (searchParams.get("occasion") ?? "other") as OccasionId;
  return <CameraCapture occasionId={occasionId} />;
}

export default function CapturePage() {
  return (
    <Suspense>
      <CaptureContent />
    </Suspense>
  );
}
