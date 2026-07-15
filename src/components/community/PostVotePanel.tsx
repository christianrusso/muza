"use client";

import { useState } from "react";
import { ScoreRing } from "@/components/community/ScoreRing";
import { track } from "@/lib/analytics";
import {
  VOTE_BUCKETS,
  bucketLabel,
  bucketForScore,
  communityScore,
  type VoteBucket,
  type VoteTally,
} from "@/lib/community/constants";

/**
 * Panel del detalle de un post: revela el Outfit Score recién después de votar.
 * Sustituye al badge sobre la foto (que en el detalle sale con candado). Cubre
 * tres casos:
 *   - Sin sesión (link compartido): mostramos el score directo como anzuelo +
 *     CTA a registrarse. El visitante ve la vidriera; no juega todavía.
 *   - Logueado sin votar: botones de voto (oculto hasta votar).
 *   - Ya revelado (voto propio o dueño): score + IA vs comunidad.
 */
export function PostVotePanel({
  postId,
  aiScore,
  isAuthed,
  isOwner,
  initialBucket,
  initialTally,
  initialRevealed,
}: {
  postId: string;
  aiScore: number;
  isAuthed: boolean;
  isOwner: boolean;
  initialBucket: VoteBucket | null;
  initialTally: VoteTally;
  initialRevealed: boolean;
}) {
  const [revealed, setRevealed] = useState(initialRevealed);
  const [bucket, setBucket] = useState<VoteBucket | null>(initialBucket);
  const [tally, setTally] = useState<VoteTally>(initialTally);
  const [voting, setVoting] = useState(false);

  async function vote(b: VoteBucket) {
    if (voting || revealed) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: b }),
      });
      const data = (await res.json()) as { tally: VoteTally };
      setTally(data.tally);
      setBucket(b);
      setRevealed(true);
      track("voted", { post_id: postId, bucket: b, correct: bucketForScore(aiScore) === b });
    } catch {
      const t: VoteTally = { low: 0, mid: 0, high: 0 };
      t[b] = 1;
      setTally(t);
      setBucket(b);
      setRevealed(true);
    } finally {
      setVoting(false);
    }
  }

  const comScore = communityScore(tally) ?? aiScore;
  const correct = bucket ? bucketForScore(aiScore) === bucket : null;

  // Vista con el score revelado. La reusan el anónimo (anzuelo) y el logueado que
  // ya votó o es dueño. El renglón "tu voto" solo sale si el que mira votó.
  const revealedView = (
    <div className="mt-4 flex flex-col items-center gap-3.5 rounded-2xl border border-line bg-white p-4">
      <ScoreRing score={aiScore} size={116} />
      {bucket && (
        <p className="text-center text-[15px] font-extrabold text-ink">
          {correct ? (
            <>¡Acertaste! 🎯</>
          ) : (
            <>
              Casi. Vos dijiste {bucketLabel(bucket)}, la IA le puso {aiScore}.
            </>
          )}
        </p>
      )}

      <div className="w-full">
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
          {bucket && (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink" /> Tu voto <b className="text-ink">{bucketLabel(bucket)}</b>
            </span>
          )}
          {isOwner && !bucket && <span className="flex items-center gap-1.5 text-faint">Es tu look</span>}
        </div>
      </div>
    </div>
  );

  // ===== Sin sesión: score visible (anzuelo) + CTA a registrarse =====
  if (!isAuthed) {
    return (
      <>
        {revealedView}
        <a
          href={`/welcome?next=${encodeURIComponent(`/community/post/${postId}`)}`}
          className="mt-3 flex h-12 items-center justify-center rounded-full bg-coral text-sm font-extrabold text-white"
        >
          Registrate para votar y sumarte
        </a>
      </>
    );
  }

  // ===== Logueado sin votar: botones de voto =====
  if (!revealed) {
    return (
      <div className="mt-4 rounded-2xl border border-line bg-white p-4">
        <p className="text-center text-[15px] font-extrabold text-ink">¿Qué score le puso la IA?</p>
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
      </div>
    );
  }

  // ===== Logueado, ya revelado (votó o es dueño) =====
  return revealedView;
}
