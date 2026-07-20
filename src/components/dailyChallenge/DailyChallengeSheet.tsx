"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { AnimatedScoreRing } from "@/components/analysis/AnimatedScoreRing";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import type { DailyChallengeItem } from "@/lib/dailyChallenge";

type Vote = "up" | "down";

export function DailyChallengeSheet({
  items,
  onClose,
  onComplete,
}: {
  items: DailyChallengeItem[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [vote, setVote] = useState<Vote | null>(null);
  const item = items[index];
  const isLast = index === items.length - 1;

  function pick(next: Vote) {
    setVote(next);
  }

  function advance() {
    if (isLast) {
      onComplete();
      return;
    }
    setIndex((i) => i + 1);
    setVote(null);
  }

  return (
    <ModalPortal>
      <div className="sheet-backdrop" onClick={onClose} />
      <BottomSheet className="challenge-sheet">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <span className="section-label">Reto diario</span>
            <div className="challenge-dots" style={{ width: 72 }}>
              {items.map((it, i) => (
                <span key={it.id} className={i < index || (i === index && vote) ? "done" : ""} />
              ))}
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">
            <MaterialIcon name="close" size={22} />
          </button>
        </div>

        <div className="challenge-photo mb-3">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={`Outfit para ${item.occasionLabel.toLowerCase()}`} />
          ) : (
            <div className="ph absolute inset-0" />
          )}
        </div>

        {!vote ? (
          <div className="fade-enter flex flex-col gap-3" key={`vote-${item.id}`}>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-serif text-[22px] leading-tight">{item.occasionLabel}</span>
              <span className="text-sm font-semibold text-muted">
                ¿Te parece justo el puntaje que le puso la IA a este outfit?
              </span>
            </div>
            <div className="ring ring--pending mx-auto" style={{ width: 84, height: 84, ["--p" as string]: 1 }}>
              <div className="inner" style={{ inset: 8 }}>
                <span className="val" style={{ fontSize: 28 }}>
                  ?
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" className="vote-btn vote-btn--down" onClick={() => pick("down")}>
                <MaterialIcon name="thumb_down" size={22} />
                No me parece
              </button>
              <button type="button" className="vote-btn vote-btn--up" onClick={() => pick("up")}>
                <MaterialIcon name="thumb_up" size={22} />
                Me parece justo
              </button>
            </div>
          </div>
        ) : (
          <div className="fade-enter flex flex-col items-center gap-3 text-center" key={`reveal-${item.id}`}>
            <AnimatedScoreRing score={item.overallScore} size={92} innerInset={8} valueFontSize={30} maxFontSize={8} />
            <span className="text-sm font-semibold text-muted">
              El <strong className="text-ink">{item.agreementRate}%</strong> de la comunidad opinó lo mismo que vos
            </span>
            <Button variant="primary" className="mt-1 w-full" onClick={advance}>
              {isLast ? "Terminar reto" : "Siguiente outfit"}
            </Button>
          </div>
        )}
      </BottomSheet>
    </ModalPortal>
  );
}
