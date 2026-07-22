import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { ChallengeCardBadge } from "@/components/challenge/ChallengeCardBadge";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { challengeDate } from "@/lib/challenge/challenge";

// ¿El usuario LOGUEADO ya jugó el reto de hoy? Para el invitado el server no puede
// saberlo (su intento vive en localStorage); eso lo completa ChallengeCardBadge.
async function playedToday(): Promise<boolean> {
  if (isDemoMode()) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { count } = await supabase
    .from("challenge_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("challenge_date", challengeDate());
  return (count ?? 0) > 0;
}

// Entrada al Reto del día desde Home. Oscura y con acento cálido (fuego) para que
// destaque —es la razón de volver todos los días—. Muestra un badge "Sin jugar hoy"
// mientras no lo jugaste, para que se note.
export async function ChallengeCard() {
  const serverPlayed = await playedToday();

  return (
    <Link
      href="/challenge"
      className="flex items-center gap-3.5 rounded-[20px] px-[18px] py-4"
      style={{ background: "#201c1a", boxShadow: "0 14px 26px -14px rgba(20,18,16,.5)" }}
    >
      <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-2xl bg-white/[.08] text-2xl">
        🔥
      </span>
      <span className="flex flex-1 flex-col items-start gap-0.5">
        <span className="flex items-center gap-2">
          <span className="whitespace-nowrap text-[17px] font-extrabold text-white">Reto del día</span>
          <ChallengeCardBadge serverPlayed={serverPlayed} />
        </span>
        <span className="text-xs font-semibold text-white/60">
          Poné a prueba tu ojo con el reto de hoy
        </span>
      </span>
      <MaterialIcon name="arrow_forward" size={24} className="flex-none text-white" />
    </Link>
  );
}
