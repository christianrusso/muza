# Alternativas evaluadas: ¿es este el mejor camino?

> **En resumen**: revisión honesta de cada decisión de diseño de esta carpeta contra sus alternativas. Conclusión general: el plan de la Fase 1 es sólido y de bajo riesgo, pero no resuelve solo el problema que arrancó esta investigación (la diferencia cultural CABA/Beijing) — eso queda como brecha abierta, no resuelta. También quedan pendientes: la red de seguridad mientras no hay volumen suficiente, y vigilar el efecto halo apenas se sume feedback de terceros.

Revisión crítica de cada decisión tomada en esta carpeta hasta ahora: qué se descartó, por qué, y qué señal debería hacernos reabrir la decisión. La idea es no quedarnos con la primera idea razonable solo porque fue la primera.

## 1. Señal de calibración: feedback explícito vs. alternativas

**Decisión tomada** ([01-feedback-signal.md](./01-feedback-signal.md)): un mecanismo nuevo, explícito, de auto-reporte ("¿te parece justo este puntaje?"), separado del like/dislike social.

| Alternativa | Por qué se descartó (o no) | Cuándo reabrirla |
|---|---|---|
| Usar like/dislike de `post_reactions` tal cual | Mezcla popularidad y atractivo con si la ropa es adecuada — es ruido, no señal | No reabrir: el problema de fondo (qué mide un like) no cambia aunque haya más volumen |
| Reacción propia en el feed (`score_agree`/`score_disagree`) | Llega a menos gente que un mensaje en el resultado personal (depende de publicar a comunidad, que es opcional) | Si la tasa de respuesta del mecanismo elegido es baja, vale sumar esta fuente además, no en su lugar |
| Señal implícita (cuánto tiempo mira el resultado, si vuelve a subir una foto "corregida" tras un score bajo) | Cero fricción para el usuario, pero mucho más difícil de interpretar sin antes tener la señal explícita para comparar | Sirve como señal *secundaria* una vez que ya haya suficiente feedback explícito para saber contra qué compararla |
| Panel de personas de confianza que revisan casos en disputa | **Descartado, no por ser mala idea sino por restricción real del equipo**: nadie tiene tiempo de operar una cola de revisión recurrente. Cualquier diseño que dependa de esto queda fuera, sin importar su costo/riesgo en el papel | No reabrir salvo que cambie la disponibilidad de tiempo del equipo — ver [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md) |

**La combinación elegida para el plan principal es feedback explícito de auto-reporte + agregación 100% automática (piso mínimo + shrinkage, ver sección 5)** — sin ninguna persona revisando casos individuales en el medio.

### Riesgo que queda incluso con esta elección: el efecto halo

Elegir feedback explícito sobre like/dislike reduce el ruido, pero no lo elimina del todo. [01-feedback-signal.md](./01-feedback-signal.md#el-efecto-halo-te-puede-gustar-la-persona-no-el-outfit) ya lo explica en detalle: cuando alguien evalúa **su propia** foto, el efecto halo (juzgar mejor o peor algo por si la persona te cae bien o mal) casi no aparece. Pero en el momento en que se sume feedback de terceros — por ejemplo, si [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md) termina usando las reacciones a fotos ajenas también para calibrar, no solo para recomendar — este riesgo vuelve con fuerza. Vale la pena repetirlo acá porque es fácil de olvidar más adelante: **cualquier expansión de esta señal más allá de "cada uno evalúa su propio resultado" necesita su propia mitigación del efecto halo**, no hereda automáticamente la limpieza de la versión actual.

## 2. Cómo agrupar: clustering por outfit vs. alternativas

**Decisión tomada** ([02-clustering.md](./02-clustering.md)): agrupar por parecido entre outfits (usando los tags que la IA ya detecta), no por datos del usuario.

| Alternativa | Por qué se descartó (o no) | Cuándo reabrirla |
|---|---|---|
| Sin agrupar nada — un solo promedio por ocasión | Más simple, pero pierde justo el matiz que motivó esta investigación: un "casual" no es siempre el mismo "casual" | Solo si el volumen es tan bajo que ni siquiera hay suficientes datos por ocasión — ahí ver la sección 5 (piso mínimo) |
| Agrupar por datos del usuario (edad, ubicación, etc.) | Riesgo de sesgo/discriminación, y pide un dato sensible nuevo — ver [12-legal-and-privacy.md](./12-legal-and-privacy.md#riesgo-de-discriminación-algorítmica) | Solo con evidencia real (no una intuición) de que agrupar por outfit no alcanza — ver el trade-off ya anotado en [02-clustering.md](./02-clustering.md#trade-off-explícito-esto-no-captura-contexto-culturalgeográfico) |
| Embeddings de imagen desde el día uno | Más precisión, pero más costo e infraestructura (`pgvector`, un modelo de embeddings) sin todavía tener evidencia de que los tags no alcanzan | Definir antes un criterio objetivo de cuándo migrar (ver abajo) — no migrar "porque suena mejor" |

**Ya hay un criterio objetivo para pasar de tags a embeddings**, sin depender de revisión manual (ver [02-clustering.md](./02-clustering.md#cómo-medir-si-un-cluster-es-bueno-sin-mirarlo-a-mano-caso-por-caso)): comparar la dispersión interna de cada cluster contra la dispersión de toda la población de análisis. Si un cluster no queda claramente menos disperso que la población general, el agrupado por tags no está separando nada de verdad, y ahí sí se justifica evaluar embeddings — se calcula automático en el mismo batch job, no hace falta que nadie revise una muestra a mano.

## 3. Arquitectura del modelo: A/B/C de 06-ml-roadmap.md, más una opción que faltaba

[06-ml-roadmap.md](./06-ml-roadmap.md) compara tres caminos (few-shot dinámico / modelo propio / ajuste estadístico híbrido). Falta nombrar uno más:

**Opción B' — Fine-tuning gestionado sobre el mismo modelo que ya usamos** (por ejemplo, la API de fine-tuning de OpenAI), en vez de entrenar un modelo propio desde cero.

- Es un punto intermedio real entre la Opción A y la Opción B que no estaba en la comparación original: el proveedor se encarga del entrenamiento, no hace falta pipeline propio, GPU, ni versionar modelos. Sigue dependiendo de un solo proveedor (hoy OpenAI, ver [01-tech-stack.md](../general-app-research/01-tech-stack.md)).
- **Costo/esfuerzo**: medio. El trabajo real está en armar y limpiar un buen set de datos de entrenamiento (el mismo volumen que pediría la Opción B), no en mantener servidores.
- **Riesgo**: se pierde algo de la ventaja que tiene hoy el prompt — hoy, cambiar un criterio de scoring es cambiar texto y desplegar; un modelo fine-tuneado necesita reentrenarse. No es automáticamente mejor que la Opción A.
- **Cuándo probarla**: es candidata a probar en paralelo a la Opción C, usando los datos que ya existen (`labels.json` + `scoring_examples`) — es barata de probar y podría hacer innecesaria la Opción B (Fase 3) si da buenos resultados.

**Una cuarta idea, descartada para producción pero útil fuera de ella**: el patrón de consenso entre varios modelos (varios LLMs puntúan lo mismo y se revisan entre sí — ver [13-tooling.md](./13-tooling.md#herramienta-relacionada-no-instalada-llm-council)). Multiplica el costo y el tiempo de espera por 8-9 veces, así que no encaja con el diseño actual de una sola llamada predecible. Pero sigue siendo útil como herramienta de calibración *fuera de producción*: darle más peso a un veredicto donde 3 modelos coinciden que a uno solo.

## 4. Personalización/onboarding: lo que se decidió y lo que se dejó afuera

**Decisión tomada** ([03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md)): onboarding opcional de rango etario + gustos, usado solo para decidir **qué mostrar** (recomendación), nunca para **cómo se calcula el score** (calibración), con una porción de contenido sorpresa para notar cambios de gusto.

| Alternativa | Por qué se descartó (o no) |
|---|---|
| No pedir nada, todo implícito | El arranque es más lento (un usuario nuevo no tiene historial todavía) — la fricción de 2-3 preguntas opcionales parece razonable a cambio de un mejor arranque |
| Recomendación basada 100% en similitud entre usuarios desde el día uno | Necesita un volumen que hoy no existe (ver [00-current-state.md](./00-current-state.md#escala-actual)) — sería complicar de más algo que todavía no lo necesita |
| Dejar que la edad/gustos también influyan el *cálculo* del score, no solo qué se muestra | Reabre el riesgo de sesgo que llevó a elegir clustering por outfit en primer lugar (sección 2) — **descartado con convicción, no es una decisión débil** |

Este es el punto donde más disciplina hace falta. Es tentador, una vez que ya se pidió la edad/gustos "para recomendar", usarlos también "para afinar el score, ya que los tenemos". Vale la pena dejarlo escrito como límite claro: **ese dato nunca cruza hacia el cálculo del score, sin excepción, sin volver a pasar por [12-legal-and-privacy.md](./12-legal-and-privacy.md)**.

## 5. Actualización: sin panel humano, la red de seguridad es 100% estadística

Esta sección proponía originalmente un panel de revisión humana. Se descartó: nadie en el equipo tiene tiempo de operar una cola de revisión recurrente, y esa restricción no es negociable (ver [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md)).

Con pocos usuarios (el número real no está relevado, ver [00-current-state.md](./00-current-state.md#escala-actual)), ningún cluster va a juntar suficientes datos como para cruzar el piso mínimo de [01-feedback-signal.md](./01-feedback-signal.md) por bastante tiempo. Sin un panel humano de respaldo, esto significa que **durante ese período el sistema tiene que seguir usando el banco `scoring_examples` estático de siempre, sin ningún ajuste automático todavía** — no hay una persona llenando el hueco mientras tanto. Es una limitación real que hay que aceptar, no resolver con más proceso.

Lo que reemplaza al panel humano no es una persona más eficiente — es el diseño estadístico que ya estaba en [01-feedback-signal.md](./01-feedback-signal.md#evitar-que-pocos-usuarios-distorsionen-el-score-de-todos):

- **Piso mínimo de muestras (`N`)**: un cluster no influye en nada hasta juntar suficientes respuestas. Antes de eso, cero ajuste — el comportamiento de hoy.
- **Ajuste gradual (shrinkage, `peso = n / (n + k)`)**: incluso después de cruzar el piso, el peso del ajuste crece con la cantidad de datos, así que un cluster con poco volumen todavía no puede mover mucho el score.
- **El reto diario** (ver [08-daily-challenge.md](./08-daily-challenge.md)) existe en gran parte para acelerar que los clusters crucen ese piso mínimo más rápido, sin que eso implique que alguien "decide" nada — sigue siendo agregación automática, solo que con más volumen de entrada.

Esto es más lento para arrancar que tener a alguien decidiendo caso por caso, y es una desventaja real frente al diseño anterior. La compensación es que, una vez que arranca, no consume tiempo de nadie — algo que el diseño anterior no podía prometer.

## Resumen honesto: qué tan cerca estamos de "la mejor app de clasificación de outfits"

| Punto | Cómo queda con lo diseñado hasta acá | Brecha más grande |
|---|---|---|
| Explicar por qué dio ese puntaje | Fuerte — se mantiene el desglose por categoría + justificación en ninguna de las opciones evaluadas se pierde esto | Ninguna: es algo que hay que cuidar activamente en cualquier fase futura, no darlo por sentado |
| Mejorar solo sin depender 100% de curación manual | Diseñado (Fase 1), todavía no implementado | Falta volumen real de uso — sin escala, esto sigue siendo teórico |
| Que el score no dependa de quién es la persona | Diseñado con esa restricción de entrada (agrupar por outfit, no por usuario) | Falta auditar de verdad una vez que haya un ajuste automático corriendo — hoy es una promesa de diseño, no algo medido |
| Que un like no contamine el score por atractivo (efecto halo) | Mitigado para auto-reporte (v1); sin resolver si se suma feedback de terceros | Es el riesgo nuevo que más hay que vigilar si se construye la función de "puntuar outfits ajenos" |
| Diferencia cultural/regional (el ejemplo original CABA/Beijing) | **No resuelto** — agrupar por outfit lo acerca, no lo garantiza (ver [02-clustering.md](./02-clustering.md#trade-off-explícito-esto-no-captura-contexto-culturalgeográfico)) | Es la brecha más honesta y más grande entre lo diseñado y el problema que arrancó esta investigación |
| Costo y velocidad | Bajo por ahora (la Fase 1 no cambia el costo actual) | Se vuelve la pregunta central recién en la Fase 2/3 |
| Cumplir con lo legal | Mapeado, no resuelto (ver [12-legal-and-privacy.md](./12-legal-and-privacy.md)) | La política de privacidad está desactualizada respecto a lo que ya necesitaría la Fase 1 — bloqueante de proceso |

**Conclusión de esta revisión**: lo diseñado para la Fase 1 es una base sólida y de bajo riesgo, pero no alcanza sola para resolver el problema que la originó. Hace falta (a) la red de seguridad humana de la sección 5 mientras no hay volumen, (b) tratar la diferencia cultural/regional como un problema abierto y nombrado, no como algo que el clustering resuelve solo, y (c) vigilar el efecto halo apenas se toque cualquier feature que le muestre a alguien la foto de otra persona.

## Open questions

- ¿Cuánto tiempo (en semanas/meses de uso real) va a tardar el primer cluster en cruzar el piso mínimo `N`, dado el volumen actual? Sin panel humano de respaldo, ese es el tiempo real que el producto va a pasar sin ningún ajuste automático.
- ¿Cuál es el número exacto de "pureza de cluster" (sección 2) que dispara la migración a embeddings? No definido todavía — hace falta una primera tanda de datos reales para calibrarlo.
- ¿Vale la pena probar la Opción B' (fine-tuning gestionado) en paralelo a la Fase 1, con los datos que ya existen (`labels.json` + `scoring_examples`)? Es barata de probar y podría evitar invertir en la Fase 2/3 antes de tiempo.
