"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { DailyChallengeSheet } from "@/components/dailyChallenge/DailyChallengeSheet";
import { DailyChallengeCompleteSheet } from "@/components/dailyChallenge/DailyChallengeCompleteSheet";
import { bumpStreak, isDoneToday, persistStreak, readStreak, type StreakState } from "@/lib/dailyChallengeStreak";
import type { DailyChallengeItem } from "@/lib/dailyChallenge";

const EMPTY_STREAK: StreakState = { lastCompletedDate: null, streak: 0 };

export function DailyChallengeCard({ items }: { items: DailyChallengeItem[] }) {
  const [open, setOpen] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [streak, setStreak] = useState<StreakState>(EMPTY_STREAK);

  useEffect(() => {
    setStreak(readStreak());
  }, []);

  if (items.length === 0) return null;

  const doneToday = isDoneToday(streak, new Date());

  function handleComplete() {
    const next = bumpStreak(readStreak(), new Date());
    persistStreak(next);
    setStreak(next);
    setJustFinished(true);
  }

  function closeAll() {
    setOpen(false);
    setJustFinished(false);
  }

  const streakBadge = streak.streak > 0 ? (
    <span className="ml-2 inline-flex h-[20px] min-w-[20px] items-center rounded-full px-1.5 text-[11px] font-extrabold text-white" style={{ background: "var(--coral)" }}>
      <MaterialIcon name="local_fire_department" size={13} filled />
      {streak.streak}
    </span>
  ) : null;

  const className = "flex w-full items-center gap-3.5 rounded-[20px] px-[18px] py-4";
  const style = {
    background: "var(--violet)",
    boxShadow: "0 14px 26px -12px rgba(143,175,62,.4)"
  };

  return (
    <>
      <button
        type="button"
        className={className}
        style={style}
        onClick={() => setOpen(true)}
      >
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-white/[.18]">
          <MaterialIcon name={doneToday ? "check_circle" : "quiz"} size={26} className="text-white" filled={doneToday} />
        </span>
        <span className="flex flex-1 flex-col items-start gap-0.5">
          <span className="text-[17px] font-extrabold text-white">
            {doneToday ? "Reto de hoy: listo" : "Reto diario"}
            {streakBadge}
          </span>
          <span className="text-xs font-semibold text-white/85">
            {doneToday ? "¡Volvé mañana!" : "Evalúa 3 outfits"}
          </span>
        </span>
        <MaterialIcon name="arrow_forward" size={24} className="text-white" />
      </button>

      {open && !justFinished && (
        <DailyChallengeSheet items={items} onClose={() => setOpen(false)} onComplete={handleComplete} />
      )}
      {open && justFinished && <DailyChallengeCompleteSheet streak={streak.streak} onDismiss={closeAll} />}
    </>
  );
}
