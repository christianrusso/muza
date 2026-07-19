# Camino técnico: opciones evaluadas

> **En resumen**: 4 caminos técnicos comparados. El plan es empezar por la Opción A (elegir mejores ejemplos para el prompt según feedback real — barato, bajo riesgo) como Fase 1, evaluar un ajuste estadístico liviano (Opción C) como Fase 2 si hace falta, y dejar un modelo propio entrenado desde cero (Opción B) como Fase 3 lejana, solo si el costo o volumen lo justifican. El fine-tuning gestionado (Opción B') es candidato a probar en paralelo, no al final.

> **Actualización tras la revisión de [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md)**: sin panel de revisión humana (descartado por falta de tiempo del equipo), la Opción A de este documento (clustering + few-shot dinámico, 100% automática) pasa a ser el plan principal desde el arranque, no una segunda fase. La Opción B' (fine-tuning gestionado) queda candidata a probar en paralelo, no como última instancia — ver el detalle completo en ese documento.

Contexto: hoy el scoring corre 100% en un LLM (`responses.parse()` de OpenAI, `temperature: 0`) más un banco de ejemplos manual — no hay modelo propio, no hay pipeline de entrenamiento, no hay infraestructura de ML en el repo (`package.json` no tiene librerías de entrenamiento ni `pgvector`, ver [01-tech-stack.md](../general-app-research/01-tech-stack.md)).

## Opción A — Few-shot dinámico (seguir por donde ya vamos)

Automatizar la carga de `scoring_examples`: en vez de cargarlos a mano, se arman (o se reordenan) usando el feedback de calibración agrupado por cluster (ver [02-clustering.md](./02-clustering.md)). El LLM sigue siendo el que puntúa; lo único que cambia es qué ejemplos ve en el prompt.

- **Costo/esfuerzo**: bajo. No hace falta infraestructura nueva de ML, solo un proceso (por lotes o al momento) que elija los ejemplos, y una forma de saber a qué cluster corresponde cada `scoring_example` y con qué feedback.
- **Riesgo**: bajo — sigue siendo predecible y se puede revisar (se puede ver exactamente qué ejemplos vio el modelo en cada respuesta).
- **Límite**: sigue dependiendo de qué tan bueno sea el LLM para generalizar. No "aprende" en el sentido de ajustar sus propios pesos internos, solo mejora el contexto que recibe.

## Opción B — Modelo propio, entrenado desde cero

Entrenar un modelo propio (por ejemplo, un análisis visual de la imagen más un clasificador) que prediga el score o una corrección al score, usando el historial de `analyses` más el feedback de calibración como datos de entrenamiento.

- **Costo/esfuerzo**: alto. Hace falta un proceso de entrenamiento, versionar los modelos, infraestructura para correrlo, y bastante más volumen de datos etiquetados que el que hay hoy.
- **Riesgo**: alto al principio — con poco volumen, un modelo propio generaliza peor que un LLM grande con un buen prompt. También se pierde algo de la explicación clara que da el LLM hoy (es más difícil auditar "por qué dio este puntaje").
- **Cuándo tiene sentido**: solo si el volumen de datos de calibración es alto y estable, y el costo por análisis de seguir usando el LLM (dinero, tiempo de respuesta) se vuelve un problema real de negocio.

## Opción B' — Fine-tuning gestionado (un punto medio entre A y B)

En vez de entrenar un modelo propio de cero, usar la función de fine-tuning que ya ofrece el proveedor actual (por ejemplo, la API de fine-tuning de OpenAI). El proveedor se encarga del entrenamiento — no hace falta pipeline propio, ni servidores, ni versionar modelos.

- **Costo/esfuerzo**: medio. El trabajo real está en armar y limpiar un buen conjunto de datos de entrenamiento (el mismo volumen que pediría la Opción B), no en mantener infraestructura.
- **Riesgo**: se pierde algo de la ventaja que tiene hoy el prompt — hoy, cambiar un criterio de scoring es cambiar texto y desplegar; un modelo fine-tuneado necesita reentrenarse. Sigue atado a un solo proveedor.
- **Cuándo probarla**: es candidata a probar en paralelo a la Opción C, con los datos que ya existen (`labels.json` + `scoring_examples`) — es barata de probar y podría hacer innecesaria la Opción B más adelante.

## Opción C — Híbrido: un ajuste estadístico liviano sobre el score del LLM

El LLM sigue puntuando las 10 categorías igual que hoy (sin tocar el prompt). Un modelo estadístico simple (nada de aprendizaje profundo) aprende, para cada `(cluster, ocasión)`, un factor de corrección sobre el `overall_score` — parecido en espíritu a como funciona hoy `occasionCeiling`, pero calculado con datos en vez de fijo en el código.

- **Costo/esfuerzo**: medio. No hace falta entrenar un modelo de visión — el ajuste se calcula sobre números que ya existen. La fórmula que hoy separa "lo que dice la IA" de "cómo se suma" (`computeOverallScore`, ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#cálculo-computeoverallscore)) ya sigue esta misma idea; este camino la extiende.
- **Riesgo**: medio — se puede seguir revisando (el ajuste es una función que se puede leer, no una caja negra), pero suma una capa más de código para mantener y probar.
- **Cuándo tiene sentido**: es el punto medio natural entre A y B — un buen "paso 2" cuando A ya no alcanza, pero B todavía no se justifica por el volumen que hay.

## Una cuarta idea, descartada para producción pero útil fuera de ella

El patrón de consenso entre varios modelos (varios LLMs puntúan lo mismo y se revisan entre sí — ver [13-tooling.md](./13-tooling.md#herramienta-relacionada-no-instalada-llm-council)) multiplica el costo y el tiempo de espera por 8-9 veces, así que no encaja con el diseño actual de una sola llamada predecible. Igual sigue siendo útil como herramienta de calibración *fuera de producción*: darle más peso a un veredicto donde 3 modelos coinciden que a uno solo.

## Propuesta de fases (a validar, no una decisión cerrada)

1. **Fase 0** — este research. No implementar nada todavía.
2. **Fase 1** — Opción A + el feedback de calibración de [01-feedback-signal.md](./01-feedback-signal.md) + el clustering básico de [02-clustering.md](./02-clustering.md). Resuelve el problema principal ("depende de que alguien decida a mano") sin necesidad de infraestructura de ML nueva.
3. **Fase 2** (depende de los resultados de la Fase 1) — si con datos reales se ve que hay patrones que se repiten por cluster y el few-shot no los corrige bien, evaluar la Opción C.
4. **Fase 3** (lejana, condicional) — Opción B, solo si el costo o el tiempo de respuesta del LLM se vuelve un problema real de negocio, y hay suficiente historial acumulado.

## Cómo medir si esto funciona

No está definido todavía — hace falta discutirlo antes de escribir la primera spec de la Fase 1. Candidatos a evaluar:

- Qué tan bien coincide el score ajustado con el criterio experto (el mismo que usa `scripts/eval/labels.json`) — ¿el ajuste automático se acerca o se aleja del criterio manual?
- Cuánto baja la carga manual: cuántos `scoring_examples` nuevos hace falta cargar a mano por mes, antes y después.
- Cuánta gente no está de acuerdo con el score (ver [01-feedback-signal.md](./01-feedback-signal.md)) — ¿baja con el tiempo?

## Open questions

- ¿Seguimos con OpenAI para la Opción A/C, o vale la pena probar otro proveedor en paralelo? Fuera del alcance de este documento — ver [01-tech-stack.md](../general-app-research/01-tech-stack.md) si surge más adelante.
- ¿Cuánto se puede gastar por análisis? No relevado — condiciona qué tan lejos se puede llevar la Fase 2/3.
