import { BackButton } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { GuestGateProvider } from "@/components/community/GuestGate";
import { ChallengeGame } from "@/components/challenge/ChallengeGame";
import { createClient } from "@/lib/supabase/server";
import { isViewerAuthed } from "@/lib/viewer";
import { isDemoMode } from "@/lib/demo";
import {
  getOrCreateTodayChallenge,
  getMyAttempt,
  buildReveal,
  getStreak,
  challengeDate,
  type ChallengeReveal,
} from "@/lib/challenge/challenge";

// El reto es global por día y su estado depende del usuario: sin cache.
export const dynamic = "force-dynamic";

// Reto del día: "¿A cuál le dio mejor score la IA?". Todos ven el mismo trío.
// Si el usuario ya respondió hoy, entra directo al revelado con su elección.
export default async function ChallengePage() {
  const challenge = await getOrCreateTodayChallenge();

  if (!challenge) {
    return (
      <div className="screen-body pad">
        <div className="screen-head">
          <BackButton href="/home" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span
            className="flex h-[92px] w-[92px] items-center justify-center rounded-[26px]"
            style={{ background: "var(--paper)", border: "2px solid var(--line-strong)" }}
          >
            <MaterialIcon name="local_fire_department" size={44} className="text-coral" />
          </span>
          <h1 className="mt-6 font-serif" style={{ fontSize: 28 }}>
            El reto de hoy todavía no está
          </h1>
          <p className="mt-3 max-w-[280px] text-[15px] font-semibold text-muted">
            Estamos preparando el próximo. Volvé en un rato o mirá la comunidad.
          </p>
        </div>
      </div>
    );
  }

  let initialPicked: string | null = null;
  let initialReveal: ChallengeReveal | null = null;
  let initialStreak: number | null = null;

  if (!isDemoMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const date = challengeDate();
      const attempt = await getMyAttempt(supabase, user.id, date);
      if (attempt) {
        initialPicked = attempt.pickedPostId;
        initialReveal = await buildReveal(date);
      }
      initialStreak = await getStreak(supabase, user.id, date);
    }
  }

  const isAuthed = await isViewerAuthed();

  return (
    <GuestGateProvider isAuthed={isAuthed}>
      <div className="screen-body pad">
        <div className="screen-head">
          <BackButton href="/home" />
        </div>
        <ChallengeGame
          looks={challenge.looks}
          occasionLabel={challenge.occasionLabel}
          initialPicked={initialPicked}
          initialReveal={initialReveal}
          initialStreak={initialStreak}
        />
      </div>
    </GuestGateProvider>
  );
}
