"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

// No renderiza nada: solo dispara `score_viewed` una vez, al montar, cuando el
// resultado real ya está en pantalla (overallScore !== null). El useRef evita
// que se duplique en re-renders / StrictMode.
export function ScoreViewedTracker(props: {
  analysisId: string;
  occasionId: string;
  analysisType: string;
  overallScore: number;
}) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    track("score_viewed", {
      analysis_id: props.analysisId,
      occasion_id: props.occasionId,
      analysis_type: props.analysisType,
      overall_score: props.overallScore,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
