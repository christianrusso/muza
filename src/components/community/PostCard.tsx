"use client";

import { useState } from "react";
import Link from "next/link";
import { relativeShortDate } from "@/lib/dates";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { useGuestGate } from "@/components/community/GuestGate";
import { AuthorLink } from "@/components/community/AuthorLink";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { AnalysisType } from "@/types/domain";

export interface PostCardData {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  caption: string | null;
  occasionLabel: string;
  postedAt: string;
  analysisType: AnalysisType;
  photoUrl: string | null;
  overallScore: number;
  // El score solo se muestra si el que mira ya votó este post (o es su dueño).
  // Si es false, el badge sale con candado ("Votá para ver").
  scoreRevealed: boolean;
  likeCount: number;
  commentCount: number;
  myReaction: "like" | "dislike" | null;
}

export function PostCard({
  post,
  // El detalle del post no muestra el badge sobre la foto: ahí el score lo maneja
  // el panel de votación (PostVotePanel). El feed sí lo muestra.
  showScoreBadge = true,
}: {
  post: PostCardData;
  showScoreBadge?: boolean;
}) {
  const { requireAuth } = useGuestGate();
  const [liked, setLiked] = useState(post.myReaction === "like");
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [toast, setToast] = useState<string | null>(null);

  async function share() {
    const url = `${window.location.origin}/community/post/${post.id}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `LookLab — Outfit de ${post.authorName}`, url });
      } catch {
        // el usuario canceló el share sheet — nada que hacer
      }
    } else {
      await navigator.clipboard.writeText(url);
      setToast("Enlace copiado");
      setTimeout(() => setToast(null), 2000);
    }
  }

  async function toggleLike() {
    // Invitado: en vez de likear, le abrimos el muro sin sacarlo de la pantalla.
    if (!requireAuth("like")) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));

    await fetch(`/api/community/posts/${post.id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: "like" }),
    });
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5">
        <AuthorLink userId={post.authorId}>
          {post.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.authorAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="ph h-10 w-10 rounded-full" />
          )}
        </AuthorLink>
        <div className="flex flex-1 flex-col items-start gap-px">
          <AuthorLink userId={post.authorId} className="text-[13.5px] font-extrabold">
            {post.authorName}
          </AuthorLink>
          <span className="text-[11px] font-semibold text-faint">
            {post.occasionLabel} · {relativeShortDate(post.postedAt)}
          </span>
        </div>
        <AnalysisTypePill type={post.analysisType} />
      </div>

      <Link
        href={`/community/post/${post.id}`}
        className="ph relative block overflow-hidden rounded-[18px]"
        style={{ aspectRatio: "4/5" }}
      >
        {post.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.photoUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {showScoreBadge && (
          <span
            className="absolute bottom-3 left-3 flex h-[38px] items-center gap-2 rounded-full py-0 pl-1.5 pr-3"
            style={{ background: "rgba(20,18,16,.72)", backdropFilter: "blur(4px)" }}
          >
            {post.scoreRevealed ? (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--green)] text-[13px] font-extrabold text-white">
                  {post.overallScore}
                </span>
                <span className="section-label text-white">Outfit Score</span>
              </>
            ) : (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
                  <MaterialIcon name="lock" size={15} />
                </span>
                <span className="section-label text-white">Votá para ver</span>
              </>
            )}
          </span>
        )}
      </Link>

      {post.caption && <p className="mt-2.5 text-sm font-semibold text-ink">{post.caption}</p>}

      <div className="mt-2.5 flex items-center gap-5">
        <button type="button" className={`react ${liked ? "on" : ""}`} onClick={toggleLike}>
          <MaterialIcon name="favorite" size={22} filled={liked} />
          <span>{likeCount}</span>
        </button>
        <Link href={`/community/post/${post.id}`} className="react">
          <MaterialIcon name="chat_bubble_outline" size={22} />
          {post.commentCount}
        </Link>
        <button
          type="button"
          onClick={share}
          aria-label="Compartir"
          className="react ml-auto text-muted"
        >
          <MaterialIcon name="ios_share" size={22} />
        </button>
      </div>
      {toast && (
        <div
          className="fixed inset-x-0 bottom-8 z-50 flex justify-center"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper">{toast}</span>
        </div>
      )}
    </div>
  );
}
