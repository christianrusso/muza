"use client";

import { useState } from "react";
import Link from "next/link";
import { relativeShortDate } from "@/lib/dates";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { ScoreRing } from "@/components/community/ScoreRing";
import { FollowButton } from "@/components/community/FollowButton";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { UserGender } from "@/types/domain";
import {
  VOTE_BUCKETS,
  bucketLabel,
  bucketForScore,
  communityScore,
  type VoteBucket,
  type VoteTally,
} from "@/lib/community/constants";
import type { VoteCardData } from "@/lib/community/votes";

function Avatar({ url, size = 40 }: { url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return <div className="ph rounded-full" style={{ width: size, height: size }} />;
}

function GenderTag({ gender }: { gender: UserGender | null }) {
  if (!gender || gender === "no_especifica") return null;
  const isM = gender === "masculino";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-extrabold"
      style={{
        background: isM ? "rgba(37,99,235,.1)" : "var(--pink-soft)",
        color: isM ? "#2563eb" : "var(--pink)",
      }}
    >
      <MaterialIcon name={isM ? "male" : "female"} size={13} />
      {isM ? "Hombre" : "Mujer"}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="absolute bottom-3 left-3 flex h-[38px] items-center gap-2 rounded-full py-0 pl-1.5 pr-3"
      style={{ background: "rgba(20,18,16,.72)", backdropFilter: "blur(4px)" }}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--green)] text-[13px] font-extrabold text-white">
        {score}
      </span>
      <span className="section-label text-white">Outfit Score</span>
    </span>
  );
}

export function VoteDeck({ initialQueue }: { initialQueue: VoteCardData[] }) {
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<{ bucket: VoteBucket; tally: VoteTally } | null>(null);
  const [voting, setVoting] = useState(false);

  const card = initialQueue[index];

  if (!card) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-[22px] py-20 text-center">
        <p className="text-lg font-extrabold text-ink">Por ahora votaste todo 👏</p>
        <p className="mt-1.5 text-sm font-semibold text-muted">Volvé más tarde o mirá a quién seguís.</p>
        <Link
          href="/community?tab=siguiendo"
          className="mt-6 inline-flex h-11 items-center rounded-full border-2 border-coral px-6 text-sm font-extrabold text-coral"
        >
          Ir a Siguiendo
        </Link>
      </div>
    );
  }

  async function vote(bucket: VoteBucket) {
    if (voting || reveal) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/community/posts/${card.postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket }),
      });
      const data = (await res.json()) as { tally: VoteTally };
      setReveal({ bucket, tally: data.tally });
    } catch {
      const tally: VoteTally = { low: 0, mid: 0, high: 0 };
      tally[bucket] = 1;
      setReveal({ bucket, tally });
    } finally {
      setVoting(false);
    }
  }

  function next() {
    setReveal(null);
    setIndex((i) => i + 1);
  }

  const aiScore = card.overallScore;
  const comScore = reveal ? communityScore(reveal.tally) ?? aiScore : aiScore;
  const correct = reveal ? bucketForScore(aiScore) === reveal.bucket : false;

  return (
    <div className="px-[22px] pt-3 pb-6">
      <div className="rounded-[22px] border border-line bg-white p-4 shadow-[0_10px_30px_-18px_rgba(20,18,16,.4)]">
        {/* Cabecera de la carta */}
        <div className="mb-3 flex items-center gap-2.5">
          <Link href={`/community/user/${card.authorId}`}>
            <Avatar url={card.authorAvatarUrl} />
          </Link>
          <div className="flex flex-1 flex-col gap-1">
            <Link href={`/community/user/${card.authorId}`} className="text-[13.5px] font-extrabold">
              {card.authorName}
            </Link>
            <div className="flex flex-wrap items-center gap-1.5">
              <GenderTag gender={card.authorGender} />
              <span className="text-[11px] font-semibold text-faint">{card.occasionLabel}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <AnalysisTypePill
              type={card.analysisType}
              style={{ height: 28, fontSize: 12.5, padding: "0 12px" }}
            />
            <span className="text-[11px] font-semibold text-faint">
              {relativeShortDate(card.postedAt)}
            </span>
          </div>
        </div>

        {/* Foto: score oculto antes de votar, revelado después */}
        <div
          className="ph relative block overflow-hidden rounded-[18px]"
          style={{ aspectRatio: "4 / 5", maxHeight: "44vh" }}
        >
          {card.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.photoUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              decoding="async"
            />
          )}
          {!reveal ? (
            <span
              className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full px-5 py-3 text-[15px] font-extrabold text-white"
              style={{ background: "rgba(20,18,16,.72)", backdropFilter: "blur(4px)" }}
            >
              ¿Qué score le puso la IA?
            </span>
          ) : (
            <ScoreBadge score={aiScore} />
          )}
        </div>

        {!reveal ? (
          /* Botones de voto */
          <div className="mt-3 flex gap-2.5">
            {VOTE_BUCKETS.map((b) => (
              <button
                key={b.bucket}
                type="button"
                disabled={voting}
                onClick={() => vote(b.bucket)}
                className="flex flex-1 flex-col items-center rounded-2xl border border-line bg-white py-3 disabled:opacity-60"
              >
                <span className="text-[15px] font-extrabold text-ink">{b.label}</span>
                <span className="mt-0.5 text-[11px] font-semibold text-faint">{b.range}</span>
              </button>
            ))}
          </div>
        ) : (
          /* Reveal */
          <div className="mt-4 flex flex-col items-center">
            <ScoreRing score={aiScore} />
            <p className="mt-3 text-center text-[15px] font-extrabold text-ink">
              {correct ? (
                <>¡Acertaste! 🎯</>
              ) : (
                <>
                  Casi. Vos dijiste {bucketLabel(reveal.bucket)}, la IA le puso {aiScore}.
                </>
              )}
            </p>

            {/* IA vs Comunidad */}
            <div className="mt-5 w-full">
              <span className="section-label">IA vs. Comunidad</span>
              <div className="relative mt-2.5 h-2 rounded-full" style={{ background: "var(--line)" }}>
                <span
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--green)]"
                  style={{ left: `${aiScore}%` }}
                />
                <span
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-coral"
                  style={{ left: `${comScore}%` }}
                />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--green)]" /> IA <b className="text-ink">{aiScore}</b>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral" /> Comunidad <b className="text-ink">{comScore}</b>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ink" /> Tu voto{" "}
                  <b className="text-ink">{bucketLabel(reveal.bucket)}</b>
                </span>
              </div>
            </div>

            {/* Seguir al autor */}
            <div
              className="mt-5 flex w-full items-center gap-3 rounded-2xl p-3"
              style={{ background: "var(--paper-2, rgba(20,18,16,.05))" }}
            >
              <Link href={`/community/user/${card.authorId}`}>
                <Avatar url={card.authorAvatarUrl} />
              </Link>
              <Link href={`/community/user/${card.authorId}`} className="flex-1 text-sm font-extrabold text-ink">
                {card.authorName}
              </Link>
              <FollowButton userId={card.authorId} initialFollowing={card.amIFollowing} size="sm" />
            </div>

            <button
              type="button"
              onClick={next}
              className="mt-4 h-[54px] w-full rounded-2xl bg-coral text-base font-extrabold text-white"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
