# Retención y activación: qué se sabe, qué falta medir, qué vale la pena construir

> **En resumen**: hoy no hay ningún dato real de cuánta gente completa el registro, sube su primera foto o vuelve al día siguiente — medir eso es el primer paso, antes de construir nada nuevo. El circuito principal (foto → score) ya funciona bien y no hay que interponerle fricción. El reto diario es la oportunidad más directa de retención; progressive profiling y notificaciones con propósito son mejoras baratas complementarias.

## Primero lo honesto: hoy no hay un embudo medido

Existe PostHog (`posthog-js`, ver [01-tech-stack.md](../general-app-research/01-tech-stack.md)) y `admin_metrics()` agrega números de negocio, pero no hay documentado ningún dashboard de embudo de activación (cuánta gente llega a `/welcome`, cuánta completa el registro, cuánta sube su primera foto, cuánta vuelve al día siguiente). Proponer mejoras de retención sin ese dato es adivinar. **El primer paso, antes de construir nada de lo que sigue, es medir ese embudo** — probablemente ya hay suficientes eventos de PostHog para armarlo sin código nuevo, solo definiendo el reporte.

Todo lo de abajo son hipótesis razonables basadas en cómo está armado el producto hoy, no verdades confirmadas con datos.

## El núcleo ya es bueno: no romperlo por agregar cosas

El circuito principal — sacás una foto, elegís ocasión, recibís un puntaje con justificación en segundos — es un "momento wow" rápido y ya funciona (ver [07-flows.md](../general-app-research/07-flows.md#flujo-de-análisis-de-outfit)). Cualquier feature nueva (reto diario, onboarding más largo) tiene que sumarse **sin** interponerse en el camino entre abrir la app y ver tu score. Si una mejora de retención agrega un paso antes de esa primera foto, hay que medir si vale la pena — la fricción ahí es la más cara de todas.

## Oportunidades concretas, en orden de esfuerzo

### 1. Progressive profiling en el onboarding (bajo esfuerzo)

[03-personalization-and-onboarding.md](../adaptive-scoring/03-personalization-and-onboarding.md) ya define esto: pedir rango etario y gustos de a poco, no todo en el registro. Concretamente: la primera pregunta (gustos de estilo) aparece recién la primera vez que el usuario entra a `community` o participa del [reto diario](../adaptive-scoring/08-daily-challenge.md), no en `/register`. Reduce fricción en el momento más caro (el registro) y pide el dato cuando ya hay contexto de por qué se lo estamos pidiendo.

### 2. El reto diario como hábito (esfuerzo medio, ver detalle en `01-daily-challenge-ui.md`)

Es la pieza más directa de retención de todo lo investigado hasta ahora — un motivo concreto para volver todos los días que no depende de subir una foto nueva. Ver [08-daily-challenge.md](../adaptive-scoring/08-daily-challenge.md) para el diseño completo y [01-daily-challenge-ui.md](./01-daily-challenge-ui.md) para dónde vive en la navegación.

### 3. Notificaciones con propósito, no ruido (esfuerzo medio)

`profiles.notifications_enabled` ya existe en el modelo de datos (ver [04-data-model.md](../general-app-research/04-data-model.md#tablas-núcleo-de-usuario)), pero no hay documentado qué tipo de notificación se manda hoy. Candidatas concretas y de bajo riesgo de fatiga:
- Recordatorio del reto diario, una vez al día, a una hora fija razonable — no más de una notificación de este tipo por día.
- Alguien comentó o reaccionó a tu publicación en comunidad — ya es una señal de interés genuino del usuario (publicó algo), no ruido.

Evitar notificaciones de "te extrañamos" genéricas sin una acción concreta detrás — son el tipo de notificación que más rápido lleva a que alguien desactive todas.

### 4. Cerrar el círculo del historial (bajo esfuerzo, ya casi está)

La tab `history` ya muestra la evolución de análisis pasados (ver [02-architecture.md](../general-app-research/02-architecture.md)). Vale la pena reforzar el mensaje "mirá cuánto mejoraste" de forma explícita — por ejemplo, comparar el score de tu primer análisis en una ocasión con el más reciente en la misma ocasión. Es contenido que ya existe en la base de datos, solo falta presentarlo con esa narrativa.

## Qué no hacer

- No copiar patrones de apps con equipos de crecimiento grandes (rachas con penalización agresiva, notificaciones múltiples por día, gamificación con monedas/niveles) sin medir primero si esta base de usuarios los necesita — con pocos usuarios (ver [00-current-state.md](../adaptive-scoring/00-current-state.md#escala-actual)), ese tipo de mecánica puede sentirse vacía (leaderboard con 5 personas) o directamente molesta.
- No agregar una quinta tab a la barra de navegación sin evidencia de que hace falta — el sistema de diseño hoy está pensado para 4 (ver [03-layout-and-responsiveness.md](../design-system/03-layout-and-responsiveness.md)), y agregar una quinta reduce el tamaño de cada ítem en una barra ya angosta (canvas fijo de 430px).

## Open questions

- ¿Qué eventos de PostHog ya existen hoy que permitirían armar el embudo de activación sin instrumentar nada nuevo? Requiere revisar el código de instrumentación, fuera del alcance de este documento.
- ¿Hay ya algún tipo de notificación push/email configurado, o `notifications_enabled` es un campo sin uso real todavía? Si es lo segundo, es un [open-decision](../general-app-research/08-open-decisions.md) más para agregar a ese documento.
