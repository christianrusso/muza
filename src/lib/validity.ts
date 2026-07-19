import type { ValidityStatus } from "@/types/domain";

/**
 * Estados que cuentan como "este análisis tiene un score real que mostrar".
 *
 * Un "partial" es un análisis legítimo: el usuario vio la pantalla de parcial,
 * apretó "Continuar de todos modos" y la IA puntuó la parte visible. Merece
 * aparecer en el historial, en el home y como publicable, igual que un "valid".
 * Lo que se excluye es "pending" (todavía sin validar) e "invalid" (rechazado).
 *
 * Antes esto no importaba porque el scoring pisaba el estado con "valid" y no
 * quedaba ningún parcial en la base. Al dejar de pisarlo, estos filtros son los
 * que evitan que un parcial desaparezca de la app.
 *
 * Vive en su propio módulo (y no en lib/analyses, que es "server-only") para que
 * lo puedan usar tanto el server como los tests.
 */
export const SCORED_VALIDITY_STATUSES: ValidityStatus[] = ["valid", "partial"];

export function isScored(status: ValidityStatus): boolean {
  return SCORED_VALIDITY_STATUSES.includes(status);
}
