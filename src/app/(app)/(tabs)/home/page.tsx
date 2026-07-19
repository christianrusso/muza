import Link from "next/link";
import { timed } from "@/lib/perf";
import { isDemoMode, DEMO_USER, DEMO_ANALYSES } from "@/lib/demo";
import { getDemoStore } from "@/lib/demoStore";
import { createClient } from "@/lib/supabase/server";
import { signedPhotoUrl } from "@/lib/supabase/photos";
import { greetingDate } from "@/lib/dates";
import { occasionLabel } from "@/lib/occasions";
import { SCORED_VALIDITY_STATUSES, isScored } from "@/lib/validity";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { ScoreRing } from "@/components/analysis/ScoreRing";
import { AnalysisTypePill } from "@/components/analysis/AnalysisTypePill";
import { NewAnalysisCard } from "@/components/analysis/NewAnalysisCard";
import type { AnalysisType, OccasionId } from "@/types/domain";
import { loadDailyChallenge } from "@/lib/dailyChallenge";
import { DailyChallengeCard } from "@/components/dailyChallenge/DailyChallengeCard";

async function loadHomeData() {
  if (isDemoMode()) {
    const created = Array.from(getDemoStore().analyses.values()).filter(
      (a) => isScored(a.validityStatus) && a.overallScore !== null,
    );
    const allScores = [
      ...DEMO_ANALYSES.map((a) => a.overallScore),
      ...created.map((a) => a.overallScore!),
    ];
    const latest = DEMO_ANALYSES.map((a) => ({
      id: a.id,
      occasion_id: a.occasionId,
      analysis_type: a.analysisType,
      overall_score: a.overallScore,
      style_descriptors: a.styleDescriptors,
      photoUrl: null as string | null,
    }))[0];

    return {
      firstName: DEMO_USER.full_name.split(" ")[0],
      avatarUrl: null as string | null,
      latest,
      totalCount: allScores.length,
      average: allScores.length
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Invitado: Home es visible pero no hay nada personal que traer. Cae en los
  // mismos estados vacíos que un usuario recién registrado, y el CTA de abajo le
  // pide la cuenta (ver NewAnalysisCard).
  if (!user) {
    return {
      firstName: null as string | null,
      avatarUrl: null as string | null,
      latest: null,
      totalCount: 0,
      average: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: validAnalyses } = await supabase
    .from("analyses")
    .select("id, occasion_id, analysis_type, overall_score, style_descriptors, photo_path, created_at")
    .eq("user_id", user.id)
    .in("validity_status", SCORED_VALIDITY_STATUSES)
    .order("created_at", { ascending: false });

  const all = validAnalyses ?? [];
  const scores = all.map((a) => a.overall_score).filter((s): s is number => s !== null);
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // El último análisis, sea del tipo que sea. Antes se pedía uno "completo"
  // (cuerpo entero) y, si la persona solo había sacado fotos de torso, la tarjeta
  // no aparecía nunca: quedaba el estado vacío de "todavía no hiciste ninguno"
  // contradiciendo al contador de al lado, que sí los cuenta a todos.
  const latestAnalysis = all[0];
  const latest = latestAnalysis
    ? {
        ...latestAnalysis,
        photoUrl: await signedPhotoUrl(supabase, latestAnalysis.photo_path, "full"),
      }
    : null;

  return {
    firstName: profile?.full_name?.split(" ")[0] ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    latest,
    totalCount: all.length,
    average,
  };
}

export default async function HomePage() {
  const [homeData, challengeItems] = await Promise.all([
    timed("home:data", loadHomeData),
    timed("home:daily-challenge", loadDailyChallenge),
  ]);
  const { firstName, avatarUrl, latest, totalCount, average } = homeData;

  return (
    <div className="screen-body pad-tab" style={{ gap: 18 }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="section-label">{greetingDate()}</span>
          {firstName ? (
            <span className="text-[26px] font-extrabold text-ink">
              Hola, <span className="font-serif italic text-[32px] font-normal">{firstName}</span>
            </span>
          ) : (
            // Invitado: no hay nombre a quién saludar. Va la propuesta de valor,
            // que además es la que ya vio en la landing y en /welcome.
            <span className="font-serif italic leading-tight text-ink" style={{ fontSize: 32 }}>
              Tu outfit, evaluado
            </span>
          )}
        </div>
        {/* Al invitado no le mostramos el círculo del avatar: no tiene cuenta, y
            un placeholder vacío ahí no dice nada. */}
        {firstName && (
          <div
            className="ph h-[46px] w-[46px] rounded-full border-2 border-white"
            style={{
              boxShadow: "0 2px 8px rgba(0,0,0,.08)",
              ...(avatarUrl
                ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}),
            }}
          />
        )}
      </div>

      {latest ? (
        <div className="card p-4" style={{ boxShadow: "0 12px 30px -18px rgba(20,18,16,.25)" }}>
          <div className="mb-3.5 flex items-center justify-between">
            <AnalysisTypePill type={(latest.analysis_type as AnalysisType) ?? "completo"} />
            <span className="section-label">Último Outfit Score</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="ph relative flex h-[132px] w-[104px] flex-none items-end justify-center overflow-hidden rounded-2xl pb-2">
              {latest.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={latest.photoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="ph-cap">foto de outfit</span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3">
              <ScoreRing score={latest.overall_score ?? 0} size={92} innerInset={8} valueFontSize={30} maxFontSize={8} />
              <div className="flex flex-col gap-px">
                <span className="font-serif text-xl leading-tight">
                  {occasionLabel(latest.occasion_id as OccasionId)}
                </span>
                <span className="text-sm font-semibold text-muted">
                  {latest.style_descriptors?.join(" • ")}
                </span>
              </div>
            </div>
          </div>
          <div className="my-3 h-px bg-line" />
          <Link href={`/analysis/${latest.id}/result`} className="flex items-center justify-between">
            <span className="text-sm font-bold text-coral">Ver análisis completo</span>
            <MaterialIcon name="chevron_right" size={20} className="text-coral" />
          </Link>
        </div>
      ) : (
        <div className="card p-4 text-center text-sm font-semibold text-muted">
          Todavía no hiciste ningún análisis. ¡Sacate una foto de tu outfit para empezar!
        </div>
      )}

      <div className="flex gap-3">
        <div className="card flex-1 p-3.5">
          <span className="section-label">Promedio histórico</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[30px] font-extrabold">{average ?? "—"}</span>
          </div>
        </div>
        <div className="card flex-1 p-3.5">
          <span className="section-label">Análisis</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[30px] font-extrabold">{totalCount}</span>
            <span className="text-[11px] font-bold text-faint">en total</span>
          </div>
        </div>
      </div>

      <NewAnalysisCard />

      {/* Próximamente: no es un botón — no navega ni se puede tocar. Está para
          anticipar la feature (borde punteado + candado), no para usarse. */}
      <div
        className="flex items-center gap-3.5 rounded-[20px] border-2 border-dashed border-line-strong px-[18px] py-4"
        aria-disabled="true"
      >
        <span
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-2xl"
          style={{ background: "var(--violet-soft)" }}
        >
          <MaterialIcon name="palette" size={26} className="text-[var(--violet)]" />
        </span>
        <span className="flex flex-1 flex-col items-start gap-0.5">
          <span className="text-[17px] font-extrabold text-muted">Generar colorimetría</span>
          <span className="text-xs font-semibold text-faint">Descubrí tu paleta ideal</span>
        </span>
        <span
          className="flex flex-none items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide"
          style={{ background: "var(--violet-soft)", color: "var(--violet)" }}
        >
          <MaterialIcon name="lock" size={13} />
          Próximamente
        </span>
      </div>

      <DailyChallengeCard items={challengeItems} />
    </div>
  );
}
