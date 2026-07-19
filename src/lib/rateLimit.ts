import "server-only";
import { serviceDb } from "@/lib/serviceDb";

// Ventanas por defecto (punto de partida conservador; ajustar con uso real).
// En env vars, no hardcodeadas en el medio del código.
const PER_MINUTE = Number(process.env.RATE_LIMIT_ANALYSES_PER_MINUTE ?? 5);
const PER_HOUR = Number(process.env.RATE_LIMIT_ANALYSES_PER_HOUR ?? 30);

/**
 * Límite de velocidad de creación de análisis (cada uno dispara 2 llamadas pagas
 * a OpenAI). Limita por usuario (principal) y por IP (red de contención). El
 * chequeo + registro es atómico en la función check_rate_limit de Postgres.
 *
 * Devuelve true si hay que RECHAZAR (429). Fail-open: si el backend falla, no
 * bloquea al usuario legítimo.
 */
export async function rateLimitAnalysisCreation({
  userId,
  ip,
}: {
  userId?: string;
  ip: string;
}): Promise<boolean> {
  const keys = [userId ? `user:${userId}` : null, `ip:${ip}`].filter(Boolean) as string[];
  try {
    const db = serviceDb();
    const results = await Promise.all(
      keys.map((key) =>
        db.rpc("check_rate_limit", { p_key: key, p_per_minute: PER_MINUTE, p_per_hour: PER_HOUR }),
      ),
    );
    // check_rate_limit devuelve true si permite; limitado si alguno dio false.
    return results.some((r) => r.data === false);
  } catch {
    return false; // fail-open
  }
}
