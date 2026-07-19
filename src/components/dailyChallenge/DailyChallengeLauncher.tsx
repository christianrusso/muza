"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { DailyChallengeSheet } from "@/components/dailyChallenge/DailyChallengeSheet";
import { DailyChallengeCompleteSheet } from "@/components/dailyChallenge/DailyChallengeCompleteSheet";
import { bumpStreak, isDoneToday, persistStreak, readStreak, type StreakState } from "@/lib/dailyChallengeStreak";
import { cn } from "@/lib/utils";
import type { DailyChallengeItem } from "@/lib/dailyChallenge";

const EMPTY_STREAK: StreakState = { lastCompletedDate: null, streak: 0 };

/**
 * Prototipo del reto diario: los outfits vienen de la comunidad real (o de
 * datos demo, ver src/lib/dailyChallenge.ts), pero la racha se guarda en
 * localStorage, no en la base de datos todavía — no hay tabla
 * `daily_challenge_responses` (ver adaptive-scoring/phases/01-fase-1b).
 * Es a propósito: validar que la interacción es divertida antes de invertir
 * en el pipeline de datos que la alimenta de verdad.
 */
export function DailyChallengeLauncher({ items }: { items: DailyChallengeItem[] }) {
  const [open, setOpen] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [streak, setStreak] = useState<StreakState>(EMPTY_STREAK);

  useEffect(() => {
    // localStorage no existe en el server — leerlo acá (no en el render) evita
    // un mismatch de hidratación entre el HTML del server y el del cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <>
      <button
        type="button"
        className={cn("fab", doneToday ? "fab--violet-done" : "fab--violet")}
        onClick={() => setOpen(true)}
      >
        <MaterialIcon name={doneToday ? "check_circle" : "quiz"} filled={doneToday} />
        {doneToday ? "Reto de hoy: listo" : "Reto diario"}
        {streak.streak > 0 && (
          <span className="streak-badge ml-1 h-[20px] min-w-[20px] rounded-full px-1.5 text-[11px] font-extrabold">
            <MaterialIcon name="local_fire_department" size={13} filled />
            {streak.streak}
          </span>
        )}
      </button>

      {open && !justFinished && (
        <DailyChallengeSheet items={items} onClose={() => setOpen(false)} onComplete={handleComplete} />
      )}
      {open && justFinished && <DailyChallengeCompleteSheet streak={streak.streak} onDismiss={closeAll} />}
    </>
  );
}
