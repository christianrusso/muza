"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/brand/MaterialIcon";
import { useGuestGate } from "@/components/community/GuestGate";
import { track } from "@/lib/analytics";

interface Look {
  postId: string;
  photoUrl: string | null;
}
interface Reveal {
  winnerPostId: string;
  scores: Record<string, number>;
  reason: string | null;
}

// El juego del Reto del día. El usuario elige a cuál de los 3 looks le puso mejor
// score la IA; al responder se revelan los 3 scores, el ganador y el por qué.
// Invitado: juega igual, pero para guardar la racha se le abre el muro.
export function ChallengeGame({
  looks,
  occasionLabel,
  initialPicked,
  initialReveal,
  initialStreak,
}: {
  looks: Look[];
  occasionLabel: string;
  initialPicked: string | null;
  initialReveal: Reveal | null;
  initialStreak: number | null;
}) {
  const { isAuthed, requireAuth } = useGuestGate();
  const [picked, setPicked] = useState<string | null>(initialPicked);
  const [reveal, setReveal] = useState<Reveal | null>(initialReveal);
  const [streak, setStreak] = useState<number | null>(initialStreak);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Invitado = sin racha del server (la página solo la manda si hay sesión). El
  // logueado ya llega bloqueado por el server (initialReveal); el invitado se
  // bloquea en el cliente (localStorage), si no podría recargar y volver a jugar.
  const isGuest = initialStreak === null;

  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    // Restaurar el intento del invitado de HOY: si ya jugó, mostramos el revelado
    // (bloqueado), no lo dejamos jugar de nuevo.
    if (isGuest && !initialReveal) {
      const saved = loadGuestAttempt();
      if (saved) {
        // En effect (no en el render) a propósito: leer localStorage durante el
        // render rompería la hidratación (server sin respuesta, cliente con ella).
        /* eslint-disable react-hooks/set-state-in-effect */
        setPicked(saved.pickedPostId);
        setReveal(saved.reveal);
        setStreak(saved.streak);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    }
    track("challenge_viewed", { occasion: occasionLabel, replay: initialReveal !== null });
  }, [occasionLabel, initialReveal, isGuest]);

  const answered = reveal !== null;
  const correct = answered && picked === reveal!.winnerPostId;

  async function choose(postId: string) {
    if (busy || answered) return;
    setPicked(postId);
    setBusy(true);
    try {
      const res = await fetch("/api/challenge/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickedPostId: postId }),
      });
      if (!res.ok) {
        setPicked(null);
        setToast("No se pudo enviar. Probá de nuevo.");
        setTimeout(() => setToast(null), 2200);
        return;
      }
      const data = (await res.json()) as { correct: boolean; reveal: Reveal; streak: number | null };
      // Invitado: racha local (arranca en 1) y guardamos el intento para bloquear
      // el replay. Autenticado: la racha viene del server (ya persistió el intento).
      const finalStreak = data.streak ?? guestStreakBump();
      setReveal(data.reveal);
      setStreak(finalStreak);
      if (data.streak === null) saveGuestAttempt(postId, data.reveal, finalStreak);
      track("challenge_answered", {
        correct: data.correct,
        streak: finalStreak,
        occasion: occasionLabel,
      });
    } catch {
      setPicked(null);
      setToast("Error de red. Probá de nuevo.");
      setTimeout(() => setToast(null), 2200);
    } finally {
      setBusy(false);
    }
  }

  function handleShare() {
    const line = correct
      ? `Le acerté al Reto del día de LookLab 🔥${streak ?? 1}`
      : `Me colgué en el Reto del día de LookLab. ¿Vos lo sacás?`;
    track("challenge_shared", { correct });
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "LookLab.io — Reto del día", text: `${line} — looklab.io` }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`${line} — looklab.io`).then(
        () => {
          setToast("Copiado");
          setTimeout(() => setToast(null), 2200);
        },
        () => {},
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-center">
        <span className="section-label">Reto del día</span>
        <h1 className="mt-1 font-serif leading-tight text-ink" style={{ fontSize: 26 }}>
          ¿A cuál le dio <span className="italic">mejor score</span> la IA para {occasionLabel}?
        </h1>
        {streak != null && streak > 0 && (
          <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold text-coral">
            🔥 Racha de {streak} {streak === 1 ? "día" : "días"}
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {looks.map((look, i) => {
          const isWinner = answered && look.postId === reveal!.winnerPostId;
          const isPicked = look.postId === picked;
          const score = answered ? reveal!.scores[look.postId] : null;
          return (
            <button
              key={look.postId}
              type="button"
              onClick={() => choose(look.postId)}
              disabled={busy || answered}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl border-2 disabled:cursor-default"
              style={{
                borderColor: isWinner
                  ? "var(--green)"
                  : isPicked && answered
                    ? "var(--coral)"
                    : isPicked
                      ? "var(--ink)"
                      : "var(--line-strong)",
              }}
            >
              {look.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={look.photoUrl} alt={`Look ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="ph absolute inset-0 flex items-center justify-center text-2xl font-black text-faint">
                  {i + 1}
                </span>
              )}

              {answered && (
                <span
                  className="absolute inset-x-0 bottom-0 flex items-center justify-center py-1.5 text-lg font-black text-white"
                  style={{ background: isWinner ? "var(--green)" : "rgba(20,18,16,.72)" }}
                >
                  {score}
                </span>
              )}
              {isWinner && (
                <span className="absolute right-1 top-1 rounded-full bg-[var(--green)] p-0.5">
                  <MaterialIcon name="check" size={16} className="text-white" filled />
                </span>
              )}
              {isPicked && answered && !isWinner && (
                <span className="absolute right-1 top-1 rounded-full bg-coral p-0.5">
                  <MaterialIcon name="close" size={16} className="text-white" filled />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {answered ? (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="text-center">
            <span className="font-serif text-[22px] text-ink">
              {correct ? "¡Acertaste! 🔥" : "Casi — la IA eligió otro"}
            </span>
            {reveal!.reason && (
              <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-muted">
                Ganó por: {reveal!.reason.replace(/[.\s]+$/, "").toLowerCase()}.
              </p>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2.5 pt-6">
            <button type="button" onClick={handleShare} className="btn btn-outline w-full">
              <MaterialIcon name="ios_share" size={20} />
              Compartí tu resultado
            </button>
            {isAuthed ? (
              <Link href="/analysis/new" className="btn btn-primary w-full">
                <MaterialIcon name="photo_camera" size={20} />
                Analizá tu propio outfit
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => requireAuth("streak")}
                className="btn btn-primary w-full"
              >
                <MaterialIcon name="local_fire_department" size={20} filled />
                Guardá tu racha
              </button>
            )}
            <Link
              href="/home"
              className="mt-1 flex items-center justify-center gap-1.5 py-1.5 text-sm font-bold text-ink"
            >
              <MaterialIcon name="close" size={18} />
              Cerrar
            </Link>
            <p className="text-center text-xs font-semibold text-faint">
              Mañana hay un reto nuevo.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-center text-[13px] font-semibold text-faint">
          {busy ? "Revelando…" : "Tocá el que creas que la IA puntuó mejor."}
        </p>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-8 z-50 flex justify-center" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <span className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper">{toast}</span>
        </div>
      )}
    </div>
  );
}

// Día en horario Argentina (UTC-3), como el server.
function arToday(): string {
  return new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
}

// Racha local del invitado: cuenta días consecutivos jugados en este dispositivo.
// Se pierde al cambiar de navegador — por eso el CTA lo empuja a registrarse.
function guestStreakBump(): number {
  try {
    const KEY = "looklab:challenge_streak";
    const yesterday = new Date(Date.now() - 3 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
    const raw = localStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as { date: string; streak: number }) : null;
    let streak = 1;
    if (prev) {
      if (prev.date === arToday()) streak = prev.streak;
      else if (prev.date === yesterday) streak = prev.streak + 1;
    }
    localStorage.setItem(KEY, JSON.stringify({ date: arToday(), streak }));
    return streak;
  } catch {
    return 1;
  }
}

// Intento del invitado guardado para bloquear el replay del día (el server no lo
// persiste para invitados). Guarda el revelado para poder mostrarlo al volver.
const ATTEMPT_KEY = "looklab:challenge_attempt";
interface SavedAttempt {
  date: string;
  pickedPostId: string;
  reveal: Reveal;
  streak: number;
}
function saveGuestAttempt(pickedPostId: string, reveal: Reveal, streak: number) {
  try {
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify({ date: arToday(), pickedPostId, reveal, streak }));
  } catch {
    // no-op
  }
}
function loadGuestAttempt(): SavedAttempt | null {
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedAttempt;
    return saved.date === arToday() ? saved : null;
  } catch {
    return null;
  }
}
