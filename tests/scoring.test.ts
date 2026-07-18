import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeOverallScore,
  occasionCeiling,
  spreadScore,
  scoreLevel,
  scoreLevelLabel,
  SCORE_LEVELS,
  SCORE_CATEGORIES,
} from "@/lib/scoring/categories";
import { canCreateAnalysis } from "@/lib/plans/gating";
import type { CategoryKey } from "@/types/domain";

// Arma las 10 categorías con un score base, permitiendo overrides por categoría.
function cats(overrides: Partial<Record<CategoryKey, number>> = {}, base = 80) {
  return SCORE_CATEGORIES.map((c) => ({ key: c.key, score: overrides[c.key] ?? base }));
}

test("occasionCeiling: adecuación alta no pone techo", () => {
  assert.equal(occasionCeiling(70), 100);
  assert.equal(occasionCeiling(85), 100);
});

test("occasionCeiling: zona media escala 40→40, 70→100", () => {
  assert.equal(occasionCeiling(40), 40);
  assert.equal(occasionCeiling(55), 70); // 40 + 15*2
});

test("occasionCeiling: desajuste fuerte, el techo es la propia nota", () => {
  assert.equal(occasionCeiling(20), 20);
  assert.equal(occasionCeiling(0), 0);
});

test("computeOverallScore: sin desajuste ni techo, es el promedio ponderado", () => {
  assert.equal(computeOverallScore(cats({}, 80)), 80);
});

test("computeOverallScore: ocasión baja aplasta el overall (techo)", () => {
  // Todo 80 pero ocasión 20 → el overall no puede superar 20.
  const overall = computeOverallScore(cats({ ocasion: 20 }, 80));
  assert.ok(overall <= 20, `esperaba <=20, dio ${overall}`);
});

test("computeOverallScore: en 'superior' se descarta calzado y no arrastra", () => {
  const conCalzadoMalo = cats({ calzado: 30, ocasion: 80 }, 85);
  const completo = computeOverallScore(conCalzadoMalo, "completo");
  const superior = computeOverallScore(conCalzadoMalo, "superior");
  assert.ok(superior > completo, `superior (${superior}) debería superar a completo (${completo})`);
});

test("computeOverallScore: sin analysisType es retrocompatible (= completo)", () => {
  const c = cats({ calzado: 30 }, 85);
  assert.equal(computeOverallScore(c), computeOverallScore(c, "completo"));
});

test("spreadScore: mantiene los anclas 0 y 100 (los extremos no se mueven)", () => {
  assert.equal(spreadScore(0), 0);
  assert.equal(spreadScore(100), 100);
});

test("spreadScore: es monótono — nunca cambia el orden de dos scores", () => {
  let prev = -1;
  for (let x = 0; x <= 100; x++) {
    const y = spreadScore(x);
    assert.ok(y >= prev, `spreadScore no es monótono en ${x}: ${y} < ${prev}`);
    prev = y;
  }
});

test("spreadScore: separa la banda densa (dos crudos cercanos quedan más lejos)", () => {
  // El caso real: el modelo dio 75 y 79 a outfits distintos (4 puntos).
  const gap = spreadScore(79) - spreadScore(75);
  assert.ok(gap > 4, `esperaba > 4 puntos de separación, dio ${gap}`);
  // Y baja el baseline inflado: un casual "correcto" (80 crudo) deja de ser 80.
  assert.ok(spreadScore(80) < 75, `esperaba < 75, dio ${spreadScore(80)}`);
});

test("spreadScore: clampa fuera de rango en vez de romper", () => {
  assert.equal(spreadScore(-10), 0);
  assert.equal(spreadScore(150), 100);
});

test("niveles: cada corte cae donde debe", () => {
  assert.equal(scoreLevel(0), "mejorar");
  assert.equal(scoreLevel(44), "mejorar");
  assert.equal(scoreLevel(45), "bien"); // primer punto del segundo nivel
  assert.equal(scoreLevel(64), "bien");
  assert.equal(scoreLevel(65), "muy_bueno");
  assert.equal(scoreLevel(79), "muy_bueno");
  assert.equal(scoreLevel(80), "impecable"); // escalón aspiracional
  assert.equal(scoreLevel(100), "impecable");
});

test("niveles: sobre la escala estirada, un outfit real cae donde corresponde", () => {
  // 85 crudo → 79 estirado → "Muy bueno". 75 crudo → 60 → "Va bien". 50 → 27 → "A mejorar".
  assert.equal(scoreLevelLabel(spreadScore(85)), "Muy bueno");
  assert.equal(scoreLevelLabel(spreadScore(75)), "Va bien");
  assert.equal(scoreLevelLabel(spreadScore(50)), "A mejorar");
});

test("niveles: los 4 están ordenados y sin huecos", () => {
  assert.equal(SCORE_LEVELS.length, 4);
  for (let i = 1; i < SCORE_LEVELS.length; i++) {
    assert.ok(
      SCORE_LEVELS[i].min > SCORE_LEVELS[i - 1].min,
      `los mínimos deben ser crecientes: ${SCORE_LEVELS[i - 1].min} → ${SCORE_LEVELS[i].min}`,
    );
  }
  // Todo puntaje 0-100 tiene nivel (sin huecos).
  for (let s = 0; s <= 100; s++) assert.ok(scoreLevel(s), `sin nivel para ${s}`);
});

test("canCreateAnalysis: lanzamiento gratis → free sin tope", () => {
  assert.equal(canCreateAnalysis({ planTier: "free", currentMonthCount: 9999 }), true);
  assert.equal(canCreateAnalysis({ planTier: "pro", currentMonthCount: 9999 }), true);
});
