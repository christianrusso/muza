"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

type Progress = {
  posts: { have: number; need: number };
  comments: { have: number; need: number };
  votes: { have: number; need: number };
};

// Dispara `colorimetry_blocked` una sola vez cuando se le muestra el muro de
// requisitos al usuario. No renderiza nada; va dentro del muro (server component).
export function ColorimetryBlockedTracker({ progress }: { progress: Progress }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track("colorimetry_blocked", {
      posts_have: progress.posts.have,
      posts_need: progress.posts.need,
      comments_have: progress.comments.have,
      comments_need: progress.comments.need,
      votes_have: progress.votes.have,
      votes_need: progress.votes.need,
    });
  }, [progress]);
  return null;
}
