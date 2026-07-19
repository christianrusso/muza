// Lógica de la racha del reto diario. Separada de la UI para poder testearla
// sin renderizar nada, y porque es lógica de negocio (qué cuenta como "seguir
// la racha"), no de presentación. La persistencia (localStorage) queda en
// funciones aparte, chicas, sin lógica propia — así lo que sí tiene reglas
// (bumpStreak) se puede probar con fechas fijas, sin mockear el navegador.

export const DAILY_CHALLENGE_STORAGE_KEY = "looklab.dailyChallenge.v1";

export interface StreakState {
  lastCompletedDate: string | null;
  streak: number;
}

const EMPTY_STREAK: StreakState = { lastCompletedDate: null, streak: 0 };

export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yesterdayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

/** ¿Ya se completó el reto en la fecha `now`? */
export function isDoneToday(state: StreakState, now: Date): boolean {
  return state.lastCompletedDate === toDateStr(now);
}

/**
 * Suma un día a la racha si el reto ya se venía completando ayer; la reinicia
 * a 1 si hubo un salto de más de un día (o es la primera vez). Si ya se
 * completó hoy, no hace nada — evita que abrir el reto dos veces el mismo día
 * cuente doble.
 */
export function bumpStreak(prev: StreakState, now: Date): StreakState {
  const today = toDateStr(now);
  if (prev.lastCompletedDate === today) return prev;
  const streak = prev.lastCompletedDate === toDateStr(yesterdayOf(now)) ? prev.streak + 1 : 1;
  return { lastCompletedDate: today, streak };
}

/** Lee la racha guardada en este dispositivo. `undefined` fuera del browser. */
export function readStreak(): StreakState {
  if (typeof window === "undefined") return EMPTY_STREAK;
  try {
    const raw = window.localStorage.getItem(DAILY_CHALLENGE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StreakState) : EMPTY_STREAK;
  } catch {
    return EMPTY_STREAK;
  }
}

export function persistStreak(state: StreakState): void {
  window.localStorage.setItem(DAILY_CHALLENGE_STORAGE_KEY, JSON.stringify(state));
}
