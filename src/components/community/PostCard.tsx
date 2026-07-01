"use client";

import { useState } from "react";
import Link from "next/link";
import { relativeShortDate } from "@/lib/dates";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { AnalysisType } from "@/types/domain";

export interface PostCardData {
  id: string;
  authorName: string;
  occasionLabel: string;
  postedAt: string;
  analysisType: AnalysisType;
  photoUrl: string | null;
  overallScore: number;
  likeCount: number;
  commentCount: number;
  myReaction: "like" | "dislike" | null;
}

export function PostCard({ post }: { post: PostCardData }) {
  const [reaction, setReaction] = useState(post.myReaction);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  async function react(next: "like" | "dislike") {
    const previous = reaction;
    const turningOn = previous !== next;
    setReaction(turningOn ? next : null);

    if (next === "like") {
      setLikeCount((c) => c + (turningOn ? 1 : -1));
    } else if (previous === "like" && turningOn) {
      // switching from like to dislike also removes the like
      setLikeCount((c) => c - 1);
    }

    await fetch(`/api/community/posts/${post.id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: next }),
    });
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="ph h-10 w-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-px">
          <span className="text-[13.5px] font-extrabold">{post.authorName}</span>
          <span className="text-[11px] font-semibold text-faint">
            {post.occasionLabel} · {relativeShortDate(post.postedAt)}
          </span>
        </div>
        <AnalysisTypePill type={post.analysisType} />
      </div>

      <Link
        href={`/community/post/${post.id}`}
        className="ph relative block overflow-hidden rounded-[18px]"
        style={{
          aspectRatio: "4/5",
          ...(post.photoUrl ? { backgroundImage: `url(${post.photoUrl})`, backgroundSize: "cover" } : {}),
        }}
      >
        <span
          className="absolute bottom-3 left-3 flex h-[38px] items-center gap-2 rounded-full py-0 pl-1.5 pr-3"
          style={{ background: "rgba(20,18,16,.72)", backdropFilter: "blur(4px)" }}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--green)] text-[13px] font-extrabold text-white">
            {post.overallScore}
          </span>
          <span className="section-label text-white">Outfit Score</span>
        </span>
      </Link>

      <div className="mt-2.5 flex items-center gap-5">
        <button type="button" className={`react ${reaction === "like" ? "on" : ""}`} onClick={() => react("like")}>
          <MaterialIcon name="favorite" size={22} filled={reaction === "like"} />
          <span>{likeCount}</span>
        </button>
        <button type="button" className={`react ${reaction === "dislike" ? "on" : ""}`} onClick={() => react("dislike")}>
          <MaterialIcon name="thumb_down" size={22} filled={reaction === "dislike"} />
        </button>
        <Link href={`/community/post/${post.id}`} className="react">
          <MaterialIcon name="chat_bubble_outline" size={22} />
          {post.commentCount}
        </Link>
        <MaterialIcon name="ios_share" size={22} className="ml-auto text-muted" />
      </div>
    </div>
  );
}
