import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/navigation/TopBar";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { ProfileAvatarLink } from "@/components/colorimetry/ProfileAvatarLink";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import { hasColorimetry } from "@/lib/colorimetry/store";
import { getColorimetryEligibility, type ColorimetryEligibility } from "@/lib/colorimetry/eligibility";

// El gate depende de la participación del usuario en la comunidad: se recalcula
// en cada request.
export const dynamic = "force-dynamic";

// La colorimetría es una por usuario. Si ya la tiene, esta ruta manda al
// resultado ("ver colorimetría"). Si no, muestra el estado para generarla —pero
// solo si cumple los requisitos de comunidad; si no, el muro "ayudanos primero".
export default async function ColorimetryPage() {
  let avatarUrl: string | null = null;
  let eligibility: ColorimetryEligibility | null = null; // null = demo (habilitado)

  if (!isDemoMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      if (await hasColorimetry(supabase, user.id)) {
        redirect("/colorimetry/result");
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      avatarUrl = profile?.avatar_url ?? null;
      eligibility = await getColorimetryEligibility(supabase, user.id);
    }
  }

  const canGenerate = eligibility === null || eligibility.eligible;

  return (
    <div className="screen-body pad">
      <div className="screen-head flex items-center justify-between">
        <BackButton href="/home" />
        <ProfileAvatarLink avatarUrl={avatarUrl} glass={false} />
      </div>

      {canGenerate ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span
              className="flex h-[92px] w-[92px] items-center justify-center rounded-[26px]"
              style={{ background: "var(--violet-soft)" }}
            >
              <MaterialIcon name="palette" size={44} className="text-[var(--violet)]" />
            </span>
            <h1 className="mt-6 font-serif" style={{ fontSize: 32 }}>
              Nueva Colorimetría
            </h1>
            <p className="mt-3 max-w-[300px] text-[15px] font-semibold leading-relaxed text-muted">
              Subí una foto actual y la IA analizará tu temporada, paleta y
              recomendaciones personalizadas.
            </p>
          </div>

          <Link href="/colorimetry/new" className="btn btn-violet">
            <MaterialIcon name="auto_awesome" size={20} />
            Generar Nueva Colorimetría
          </Link>
        </>
      ) : (
        <ColorimetryGate eligibility={eligibility!} />
      )}
    </div>
  );
}

// Muro "ayudanos primero": el servicio es gratis, pero para desbloquearlo pedimos
// una participación mínima en la comunidad. Checklist con progreso en vivo.
function ColorimetryGate({ eligibility }: { eligibility: ColorimetryEligibility }) {
  const items: { icon: string; label: string; have: number; need: number }[] = [
    { icon: "photo_camera", label: "Subir fotos a la comunidad", ...eligibility.progress.posts },
    { icon: "chat_bubble", label: "Comentar publicaciones", ...eligibility.progress.comments },
    { icon: "favorite", label: "Votar looks de otros", ...eligibility.progress.votes },
  ];

  return (
    <>
      <div className="flex flex-1 flex-col justify-center">
        <div className="text-center">
          <span
            className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-[26px]"
            style={{ background: "var(--violet-soft)" }}
          >
            <MaterialIcon name="palette" size={44} className="text-[var(--violet)]" />
          </span>
          <h1 className="mt-6 font-serif" style={{ fontSize: 32 }}>
            Colorimetría
          </h1>
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-muted">
            Este servicio es <span className="text-ink">totalmente gratis</span>. Solo te
            pedimos que primero nos des una mano en la comunidad. Cuando completes esto, se
            desbloquea:
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-2.5">
          {items.map((it) => {
            const done = it.have >= it.need;
            return (
              <div
                key={it.label}
                className="flex items-center gap-3.5 rounded-[16px] border-2 px-4 py-3.5"
                style={{
                  borderColor: done ? "var(--violet)" : "var(--line-strong)",
                  background: done ? "var(--violet-soft)" : "transparent",
                }}
              >
                <MaterialIcon
                  name={done ? "check_circle" : it.icon}
                  size={24}
                  className="flex-none text-[var(--violet)]"
                  filled={done}
                />
                <span className="flex-1 text-[15px] font-bold text-ink">{it.label}</span>
                <span
                  className="flex-none text-[15px] font-extrabold tabular-nums"
                  style={{ color: done ? "var(--violet)" : "var(--muted)" }}
                >
                  {Math.min(it.have, it.need)}/{it.need}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Link href="/community" className="btn btn-violet">
        <MaterialIcon name="groups" size={20} />
        Ir a la comunidad
      </Link>
    </>
  );
}
