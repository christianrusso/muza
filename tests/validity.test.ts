import { test } from "node:test";
import assert from "node:assert/strict";
import { hasEvaluableGarments } from "@/lib/ai/schema";
import { isScored, SCORED_VALIDITY_STATUSES } from "@/lib/validity";
import { scoreLevelLabel, scoreBandColorVar, SCORE_LEVELS, spreadScore } from "@/lib/scoring/categories";
import type { ValidityStatus } from "@/types/domain";

// ============================================================================
// hasEvaluableGarments — la red que ataja las fotos sin outfit
// ============================================================================
// El bug que motivó esto: un primer plano de la cara con ocasión "Casamiento ·
// Playa" pasó la validación, se puntuó, y salió un 16/100 en la pantalla normal.
// El usuario lee ese número como un juicio sobre su ropa, cuando en realidad
// nunca vimos su ropa.

function detected(over: Partial<Parameters<typeof hasEvaluableGarments>[0]> = {}) {
  return {
    prendasSuperiores: [],
    prendasInferiores: [],
    calzado: [],
    accesorios: [],
    colores: [],
    estilo: null,
    ...over,
  };
}

test("hasEvaluableGarments: sin ninguna prenda detectada no hay outfit", () => {
  assert.equal(hasEvaluableGarments(detected()), false);
});

test("hasEvaluableGarments: el retrato del bug — sólo accesorios y colores no alcanza", () => {
  // Lo que devuelve el modelo ante un primer plano de la cara: ve los aros, ve
  // los colores de la piel y el fondo, y ninguna prenda. Si esto contara como
  // outfit, volveríamos a producir el 16/100.
  assert.equal(
    hasEvaluableGarments(detected({ accesorios: ["Aros"], colores: ["Beige"], estilo: "Natural" })),
    false,
  );
});

test("hasEvaluableGarments: una sola lista de prendas ya alcanza", () => {
  // Un análisis "superior" legítimo no tiene calzado, y uno "individual" tiene
  // una prenda sola. Ninguno de los dos debe caer en la red.
  assert.equal(hasEvaluableGarments(detected({ prendasSuperiores: ["Camisa de lino"] })), true);
  assert.equal(hasEvaluableGarments(detected({ prendasInferiores: ["Pantalón de vestir"] })), true);
  assert.equal(hasEvaluableGarments(detected({ calzado: ["Alpargatas"] })), true);
});

// ============================================================================
// isScored — que un parcial no desaparezca de la app
// ============================================================================
// El scoring pisaba validity_status con "valid" y se perdía el estado "partial".
// Al dejar de pisarlo, estos filtros son los que evitan que un análisis parcial
// se vuelva invisible en home, historial, perfil y publicar.

test("isScored: valid y partial tienen score para mostrar; pending e invalid no", () => {
  assert.equal(isScored("valid"), true);
  assert.equal(isScored("partial"), true);
  assert.equal(isScored("pending"), false);
  assert.equal(isScored("invalid"), false);
});

test("isScored: cubre todos los estados posibles, sin agujeros", () => {
  // Si alguien agrega un estado nuevo al enum, este test obliga a decidir de qué
  // lado cae en vez de dejarlo caer en "no scoreado" por omisión.
  const todos: ValidityStatus[] = ["pending", "valid", "partial", "invalid"];
  for (const s of todos) assert.equal(typeof isScored(s), "boolean");
  assert.deepEqual(SCORED_VALIDITY_STATUSES, ["valid", "partial"]);
});

// ============================================================================
// La insignia y el aro no pueden contradecirse
// ============================================================================
// El bug: la insignia decía "Para mejorar" (texto libre del modelo) con estilo
// VERDE fijo, sobre un score de 16 que pintaba el aro de rojo. Ahora las dos
// cosas salen del mismo score, así que la contradicción es imposible por
// construcción — este test lo fija.

test("insignia y banda del score salen siempre del mismo nivel", () => {
  for (let score = 0; score <= 100; score++) {
    const label = scoreLevelLabel(score);
    const color = scoreBandColorVar(score);
    const nivel = SCORE_LEVELS.find((l) => l.label === label);
    assert.ok(nivel, `sin nivel para el label "${label}" (score ${score})`);
    assert.equal(
      color,
      nivel.colorVar,
      `score ${score}: la insignia dice "${label}" pero el color es ${color}`,
    );
  }
});

test("el caso exacto del bug: 16 no puede mostrar un label de banda alta", () => {
  assert.equal(scoreLevelLabel(16), "A mejorar");
  assert.equal(scoreBandColorVar(16), "var(--red)");
  // Y el 16 sale de ahí: una ocasión de 30 se vuelve el techo del general
  // (occasionCeiling) y spreadScore lo deja en 16.
  assert.equal(spreadScore(30), 16);
});
