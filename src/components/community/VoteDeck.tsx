"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { loadMoreVoteCards } from "@/app/(app)/(tabs)/community/actions";
import { relativeShortDate } from "@/lib/dates";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { ScoreRing } from "@/components/community/ScoreRing";
import { FollowButton } from "@/components/community/FollowButton";
import { useGuestGate } from "@/components/community/GuestGate";
import { AuthorLink } from "@/components/community/AuthorLink";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { track } from "@/lib/analytics";
import type { UserGender } from "@/types/domain";
import {
  VOTE_BUCKETS,
  bucketLabel,
  bucketForScore,
  emptyTally,
  communityScore,
  communityLevel,
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

// Foto del outfit: se muestra ENTERA (object-contain) sobre una copia borrosa de
// sí misma (cover) como relleno, para no recortar la prenda. Ocupa el alto
// disponible dentro de la carta.
function CardPhoto({ url, children }: { url: string | null; children?: ReactNode }) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[18px]" style={{ background: "#14120e" }}>
      {url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "blur(22px)", transform: "scale(1.15)" }}
            decoding="async"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" decoding="async" />
        </>
      )}
      {children}
    </div>
  );
}

// Cuántas cartas ya mostradas mandamos como "no repitas estas". Es una ventana,
// no el historial completo: con el corpus chico, excluir todo dejaría la cola seca.
const RECENT_WINDOW = 40;
// Cuántas cartas sin consumir tienen que quedar para pedir la próxima tanda.
const PREFETCH_AT = 4;

export function VoteDeck({ initialQueue }: { initialQueue: VoteCardData[] }) {
  const { requireAuth } = useGuestGate();
  const [cards, setCards] = useState(initialQueue);
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<{ bucket: VoteBucket; tally: VoteTally } | null>(null);
  const [voting, setVoting] = useState(false);
  // Solo se prende si el servidor devuelve una tanda vacía: ahí no hay nada que
  // votar en toda la comunidad y el deck sí puede terminar. Una cola inicial
  // vacía ya significa eso (loadVoteQueue recicla antes de devolver nada).
  const [exhausted, setExhausted] = useState(initialQueue.length === 0);
  const loadingRef = useRef(false);

  const topUp = useCallback(async (recent: string[]) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const next = await loadMoreVoteCards(recent);
      if (next.length === 0) setExhausted(true);
      else setCards((prev) => [...prev, ...next]);
    } catch {
      // Sin red la tanda actual sigue siendo válida; se reintenta en el próximo next().
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const card = cards[index];

  if (!card) {
    // Sin carta pero con tanda en vuelo: es un hueco momentáneo, no el final.
    if (!exhausted) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-[22px] py-20 text-center">
          <p className="text-sm font-semibold text-muted">Buscando más looks…</p>
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-[22px] py-20 text-center">
        <p className="text-lg font-extrabold text-ink">Todavía no hay looks para votar 👀</p>
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
    // Invitado: el muro en vez del voto. Sin voto no hay reveal, así que el score
    // y el resultado de la comunidad le siguen quedando tapados.
    if (!requireAuth("vote")) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/community/posts/${card.postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket }),
      });
      const data = (await res.json()) as { tally: VoteTally };
      setReveal({ bucket, tally: data.tally });
      track("voted", {
        post_id: card.postId,
        bucket,
        correct: bucketForScore(aiScore) === bucket,
      });
    } catch {
      const tally: VoteTally = emptyTally();
      tally[bucket] = 1;
      setReveal({ bucket, tally });
    } finally {
      setVoting(false);
    }
  }

  function next() {
    setReveal(null);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    // Recarga anticipada: la próxima tanda se pide antes de tocar el fondo, así
    // el usuario nunca ve el hueco.
    if (!exhausted && cards.length - nextIndex <= PREFETCH_AT) {
      void topUp(cards.slice(-RECENT_WINDOW).map((c) => c.postId));
    }
  }

  const aiScore = card.overallScore;

  // Cabecera compartida por ambos estados.
  const header = (
    <div className="mb-3 flex items-center gap-2.5">
      <AuthorLink userId={card.authorId}>
        <Avatar url={card.authorAvatarUrl} />
      </AuthorLink>
      <div className="flex flex-1 flex-col items-start gap-1">
        <AuthorLink userId={card.authorId} className="text-[13.5px] font-extrabold">
          {card.authorName}
        </AuthorLink>
        <div className="flex flex-wrap items-center gap-1.5">
          <GenderTag gender={card.authorGender} />
          <span className="text-[11px] font-semibold text-faint">{card.occasionLabel}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <AnalysisTypePill type={card.analysisType} style={{ height: 28, fontSize: 12.5, padding: "0 12px" }} />
        <span className="text-[11px] font-semibold text-faint">{relativeShortDate(card.postedAt)}</span>
      </div>
    </div>
  );

  // ===== Antes de votar: foto (sin nada tapándola) + pregunta debajo + botones =====
  if (!reveal) {
    return (
      <div className="flex flex-1 flex-col px-[22px] pb-4 pt-3">
        <div className="flex flex-1 flex-col rounded-[22px] border border-line bg-white p-4 shadow-[0_10px_30px_-18px_rgba(20,18,16,.4)]">
          {header}
          <CardPhoto url={card.photoUrl} />
          <p className="mt-3 text-center text-[15px] font-extrabold text-ink">¿Qué score le puso la IA?</p>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            {VOTE_BUCKETS.map((b) => (
              <button
                key={b.bucket}
                type="button"
                disabled={voting}
                onClick={() => vote(b.bucket)}
                className="flex flex-col items-center rounded-2xl border border-line bg-white py-3 disabled:opacity-60"
              >
                <span className="text-[15px] font-extrabold text-ink">{b.label}</span>
                <span className="mt-0.5 text-[11px] font-semibold text-faint">{b.range}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== Revelado: la foto se reemplaza por el resultado, en el mismo lugar =====
  // El número solo posiciona el punto en la barra; lo que se muestra es el nivel.
  // Acá el tally siempre trae al menos el voto propio, así que nunca es null.
  const comScore = communityScore(reveal.tally) ?? aiScore;
  const comLevel = communityLevel(reveal.tally);
  const correct = bucketForScore(aiScore) === reveal.bucket;

  return (
    <div className="flex flex-1 flex-col px-[22px] pb-4 pt-3">
      <div className="flex flex-1 flex-col rounded-[22px] border border-line bg-white p-4 shadow-[0_10px_30px_-18px_rgba(20,18,16,.4)]">
        {header}

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 py-1">
          <ScoreRing score={aiScore} size={116} />
          <p className="text-center text-[15px] font-extrabold text-ink">
            {correct ? (
              <>¡Acertaste! 🎯</>
            ) : (
              <>
                Casi. Vos dijiste {bucketLabel(reveal.bucket)}, la IA le puso {aiScore}.
              </>
            )}
          </p>

          {/* IA vs Comunidad */}
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
              {comLevel && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral" /> Comunidad{" "}
                  <b className="text-ink">{bucketLabel(comLevel)}</b>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ink" /> Tu voto{" "}
                <b className="text-ink">{bucketLabel(reveal.bucket)}</b>
              </span>
            </div>
          </div>

          {/* Seguir al autor */}
          <div
            className="flex w-full items-center gap-3 rounded-2xl p-3"
            style={{ background: "var(--paper-2, rgba(20,18,16,.05))" }}
          >
            <AuthorLink userId={card.authorId}>
              <Avatar url={card.authorAvatarUrl} />
            </AuthorLink>
            <AuthorLink userId={card.authorId} className="flex-1 text-left text-sm font-extrabold text-ink">
              {card.authorName}
            </AuthorLink>
            <FollowButton userId={card.authorId} initialFollowing={card.amIFollowing} size="sm" />
          </div>
        </div>

        <button
          type="button"
          onClick={next}
          className="mt-3 h-[54px] w-full flex-none rounded-2xl bg-coral text-base font-extrabold text-white"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
