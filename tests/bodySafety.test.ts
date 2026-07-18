import { test } from "node:test";
import assert from "node:assert/strict";
import { mentionsBody, stripBodyMentions } from "@/lib/ai/bodySafety";

// Fugas REALES detectadas en producción (informe de marca). Son la razón de que
// este filtro exista: el prompt ya las prohibía y aparecieron igual.
const FUGAS_REALES = [
  "La camisa parece tener un buen ajuste, resaltando una silueta limpia.",
  "Las proporciones del suéter parecen adecuadas para el tipo de cuerpo.",
  "El outfit es coherente, creando una silueta equilibrada y relajada.",
  "Las proporciones entre la camiseta y los jeans crean una silueta armoniosa.",
  "El estilo bohemio se mantiene con una silueta fluida.",
];

// Texto legítimo: describe LA PRENDA. Si el filtro se los come, la app deja de
// poder decir lo que tiene que decir. Salieron de corridas reales del modelo.
const TEXTO_LEGITIMO = [
  "El calzado robusto es apropiado para un entorno urbano y clima fresco.",
  "El uso de un abrigo de cuero y botas robustas es moderno y está en tendencia.",
  "Incorporar un cinturón delgado para marcar la cintura del vestido.",
  "El pantalón cae bien y el largo es el correcto.",
  "La camisa queda holgada en los hombros.",
  "Las proporciones entre el abrigo y el pantalón funcionan bien.",
  "Los colores neutros combinan con equilibrio y elegancia.",
];

test("mentionsBody: detecta las fugas reales de producción", () => {
  for (const t of FUGAS_REALES) {
    assert.ok(mentionsBody(t), `debería detectar: "${t}"`);
  }
});

test("mentionsBody: NO marca texto que describe prendas", () => {
  for (const t of TEXTO_LEGITIMO) {
    assert.ok(!mentionsBody(t), `falso positivo en: "${t}"`);
  }
});

test("mentionsBody: tolera null y vacío", () => {
  assert.equal(mentionsBody(null), false);
  assert.equal(mentionsBody(undefined), false);
  assert.equal(mentionsBody(""), false);
});

test("stripBodyMentions: anula la justificación que habla del cuerpo y deja el resto", () => {
  const { result, removed } = stripBodyMentions({
    categories: [
      { key: "fit", score: 80, justification: "resaltando una silueta limpia" },
      { key: "colores", score: 75, justification: "Los neutros combinan bien." },
    ],
    strengths: ["Buena combinación de colores", "Favorece tu figura"],
    improvements: ["Sumá un cinturón delgado"],
    recommendations: ["Probá botas robustas", "Elegí algo que estilice"],
  });

  assert.equal(removed, 3, "esperaba 3 textos filtrados");
  // La justificación con "silueta" se anula, pero el score NO se toca.
  assert.equal(result.categories[0].justification, null);
  assert.equal((result.categories[0] as { score: number }).score, 80);
  // La legítima sobrevive intacta.
  assert.equal(result.categories[1].justification, "Los neutros combinan bien.");
  // De las listas se cae solo lo que habla de la persona.
  assert.deepEqual(result.strengths, ["Buena combinación de colores"]);
  assert.deepEqual(result.improvements, ["Sumá un cinturón delgado"]);
  assert.deepEqual(result.recommendations, ["Probá botas robustas"]);
});
