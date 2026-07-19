# Motor de scoring

> **En resumen**: la IA puntúa 10 categorías con peso fijo (ocasión pesa más, 20%), y el servidor calcula el score final con una fórmula determinística — la IA nunca agrega el total. Un "techo de ocasión" evita que un outfit muy inadecuado para la ocasión saque un score alto sostenido por otras categorías. El banco `scoring_examples` es lo que hoy calibra el criterio, cargado a mano.

Es el corazón funcional del producto: convierte una foto + contexto de ocasión en un puntaje 0-100 con justificación. Diseño deliberado: **la IA puntúa cada categoría, el server calcula el overall score** con una fórmula determinística — no le pedimos a la IA que agregue.

## Las 10 categorías y sus pesos (`src/lib/scoring/categories.ts`)

| key | label | weight |
|---|---|---|
| `ocasion` | Adecuación a la ocasión | 0.20 |
| `fit` | Fit | 0.15 |
| `colores` | Combinación de colores | 0.15 |
| `coherencia` | Coherencia del outfit | 0.15 |
| `calzado` | Calzado | 0.10 |
| `proporciones` | Proporciones | 0.10 |
| `accesorios` | Accesorios | 0.05 |
| `estado_prendas` | Estado de las prendas | 0.05 |
| `modernidad` | Modernidad | 0.03 |
| `originalidad` | Originalidad | 0.02 |

Suma = 1.00.

## Techo de ocasión (`occasionCeiling`)

La categoría `ocasion` no es solo un término ponderado más — actúa como **techo** del score final:

```ts
if (occasionScore >= 70) return 100;               // no limita
if (occasionScore >= 40) return 40 + (occasionScore - 40) * 2; // 40→40, 70→100
return occasionScore;                                // limita fuerte
```

Motivo documentado en el código: sin este techo, un outfit muy inadecuado para la ocasión (ej. remera de fútbol en un casamiento) igual quedaba ~60-61 de score porque otras categorías (fit, colores, etc.) lo sostenían — resultado contraintuitivo para el usuario. Validado contra ground truth el 2026-07-02.

## Categorías inaplicables según tipo de análisis

`INAPPLICABLE_BY_TYPE = { superior: ["calzado"] }` — en un análisis de tipo "superior" (solo la parte de arriba del cuerpo), `calzado` se descarta y su peso se **renormaliza** entre las categorías restantes (no se le pone una nota neutra promediada).

## Cálculo (`computeOverallScore`)

1. Filtra categorías aplicables según `analysisType`.
2. Renormaliza pesos sobre el total de las aplicables.
3. `weighted = Σ(score_i * weight_i) / Σ(weight_i)`.
4. `final = min(weighted, occasionCeiling(score_ocasion))`.
5. Redondea.

## El prompt (`src/lib/ai/prompts/scoring.prompt.ts` + `scoreOutfit.ts`)

- **Modelo**: `responses.parse()` de OpenAI, `temperature: 0` — decisión explícita para consistencia ("el mismo look no puede dar 82 una vez y 74 la siguiente").
- **Inputs**: `photoUrl`, `occasionLabel`, `occasionVariant?`, `occasionContext?`, `analysisType`, `examples?` (few-shot).
- **System prompt** instruye: analizar EXCLUSIVAMENTE vestimenta (nunca cuerpo/apariencia física), puntuar por adecuación a la ocasión y no por cantidad (ej. sin accesorios en el gimnasio está bien, no debe restar), puntuar 70 (neutro) las categorías no visibles según `analysisType`, y devolver el overall score NO lo calcula el modelo — eso lo hace el server.
- **Few-shot**: si hay `examples` (de la tabla `scoring_examples`, filtrados por ocasión), se anteponen como pares imagen(`detail:low`)+veredicto(`ADECUADO ✓`/`NO ADECUADO ✗`)+nota de experto, antes de la imagen real del usuario (`detail:high`).

## Schema de salida (`src/lib/ai/schema.ts`, Zod)

```ts
ScoringResultSchema = {
  analysisType, styleDescriptors: string[], occasionContext: string|null,
  categories: ScoringCategorySchema[10],  // exactamente 10, una por key
  qualitativeBadge: string,
  detected: { prendasSuperiores, prendasInferiores, calzado, accesorios, colores: string[], estilo: string|null },
  strengths: string[], improvements: string[], recommendations: string[],
}
```

Paso previo de validación de foto (`ValidationResultSchema`): `{ verdict: valid|partial|invalid, analysisType: nullable, issues: string[], partialReason: string|null }`.

## Bandas de score

`{ high: 75, medium: 60 }` → `>=75` verde, `60-74` ámbar, `<60` rojo (usado en UI para el color del `ScoreRing`).

## Dónde tocar si hay que ajustar el modelo

- Cambiar pesos/umbrales de negocio → `src/lib/scoring/categories.ts` (no requiere tocar el prompt).
- Cambiar qué le pedimos a la IA o cómo redactamos las instrucciones → `src/lib/ai/prompts/scoring.prompt.ts`.
- Cambiar la forma del output → `src/lib/ai/schema.ts` (impacta ambos lados, hay que mantenerlos sincronizados a mano — no hay generación automática de tipos desde el schema hacia el prompt ni viceversa).
- Calibrar con más/mejores ejemplos → tabla `scoring_examples` + `scripts/eval/` (sistema propio de evaluación, ver [09-risks.md](./09-risks.md) para el estado de testing general).
