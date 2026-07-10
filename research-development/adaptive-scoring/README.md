# Adaptive scoring & feedback loop

Investigación (todavía no implementada) sobre cómo hacer que el motor de scoring deje de depender 100% de que una persona etiquete cada foto a mano, y empiece a aprender de datos reales de uso.

Punto de partida: [06-scoring-engine.md](../general-app-research/06-scoring-engine.md) (cómo puntúa hoy) y [04-data-model.md](../general-app-research/04-data-model.md) (comunidad: `community_posts`, `post_reactions`, `post_comments`).

## Documentos

**Problema y diseño**
- [00-current-state.md](./00-current-state.md) — qué hay hoy, y el problema concreto que motiva esta investigación.
- [01-feedback-signal.md](./01-feedback-signal.md) — qué señal usar para calibrar (like/dislike vs. una señal explícita), el riesgo del efecto halo, y cómo evitar que pocos usuarios distorsionen el score de todos.
- [02-clustering.md](./02-clustering.md) — cómo agrupar sin usar datos sensibles de las personas, para calibrar el score.
- [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md) — onboarding de preferencias (edad, gustos) para recomendar qué outfits puntuar, y cómo notar que los gustos de alguien cambiaron con el tiempo.

**¿Es el mejor camino?**
- [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md) — **leer primero**: sin panel de revisión humana (descartado, el equipo no tiene tiempo de operarlo), ¿alcanza con ingeniería de datos 100% automática, o hace falta aprendizaje automático real desde el arranque? Cambia el orden de prioridad del resto de esta carpeta.
- [05-alternatives-and-tradeoffs.md](./05-alternatives-and-tradeoffs.md) — revisión crítica de cada decisión de diseño contra sus alternativas, qué se descartó y por qué, y un resumen honesto de qué tan cerca estamos de ser la mejor app de clasificación de outfits.

**Camino técnico y plan**
- [06-ml-roadmap.md](./06-ml-roadmap.md) — caminos técnicos evaluados (incluye el fine-tuning gestionado como opción intermedia) y una propuesta de fases.
- [07-implementation-plan.md](./07-implementation-plan.md) — índice de fases con supuestos y tiempo total consolidado. El detalle de cada fase (pasos, tiempos, infraestructura, qué cambia en la app) vive en [phases/](./phases/).
- [08-daily-challenge.md](./08-daily-challenge.md) — el "reto diario": cómo conseguir feedback de la comunidad de forma constante, acelerando el piso mínimo estadístico del ajuste automático sin que se sienta como trabajo. Ver también [ux-growth/01-daily-challenge-ui.md](../ux-growth/01-daily-challenge-ui.md) para dónde vive en la navegación.
- [09-recommendations-feedback-loop.md](./09-recommendations-feedback-loop.md) — cómo calibrar, también de forma automática, las sugerencias de mejora del outfit (`improvements`/`recommendations`) que ya devuelve el modelo — es una señal distinta al score y con su propio riesgo de efecto halo.

**Validación y guardrails**
- [10-acceptance-criteria-and-testing.md](./10-acceptance-criteria-and-testing.md) — criterios de aceptación y casos de prueba por sub-fase, casos donde alguien intenta hacer trampa, frenos obligatorios (legal, escala mínima, equidad, interruptor de apagado), y los números que dicen si esto realmente está funcionando.

**Datos y legal**
- [11-training-data-sourcing.md](./11-training-data-sourcing.md) — de dónde saldrían las fotos para calibrar o entrenar, costos y riesgos.
- [12-legal-and-privacy.md](./12-legal-and-privacy.md) — la diferencia entre lo que dice hoy la política de privacidad y lo que esta iniciativa necesitaría, y hasta dónde se puede avanzar sin un abogado de verdad.

**Herramientas**
- [13-tooling.md](./13-tooling.md) — qué herramientas/skills de Claude Code ayudan (y cuáles no existen) para esta iniciativa, y qué quedó instalado de verdad.

## Carpetas relacionadas

- [ux-growth/](../ux-growth/) — retención y activación, incluida la parte visual del reto diario.
- [architecture-evolution/](../architecture-evolution/) — dónde corren los procesos por lotes que trae esta carpeta (clustering, reto diario), y qué falta para estar listos para escalar y para cobrar.

## Cómo no perder el rumbo

Antes de escribir la primera spec en `specs/`, los 4 frenos de [10-acceptance-criteria-and-testing.md](./10-acceptance-criteria-and-testing.md#guardrails-que-aplican-a-toda-la-iniciativa-no-negociables) tienen que estar resueltos: legal, escala mínima conocida, interruptor de apagado diseñado, y equidad revisable. Si en algún momento una decisión nueva no encaja con alguno de estos documentos, es señal de volver a mirar [05-alternatives-and-tradeoffs.md](./05-alternatives-and-tradeoffs.md) antes de improvisar sobre la marcha.

## Estado

Investigación en curso, todavía sin código ni migraciones. Nada de esto es una spec — cuando haya una fase priorizada, se abre una spec puntual en `specs/` siguiendo [02-spec-driven-development.md](../engineering-guidelines/02-spec-driven-development.md) (cambios en el motor de scoring y en el modelo de datos necesitan spec).
