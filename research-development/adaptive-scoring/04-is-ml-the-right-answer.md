# ¿Es machine learning la solución? Una respuesta directa

Pedido explícito: no defender lo ya escrito en esta carpeta solo porque ya está escrito. Esta es una revisión honesta de si hace falta aprendizaje automático de verdad, o si hay caminos más baratos y más seguros que resuelven el mismo problema.

**Restricción explícita del equipo**: nadie tiene tiempo de operar un proceso donde una persona revisa casos a mano de forma recurrente — no es una preferencia, es una limitación real de un equipo de 2 personas. Cualquier camino que dependa de que alguien revise una cola cada semana **queda descartado de entrada**, sin importar qué tan barato o de bajo riesgo sea en el papel. Esto cambia la comparación de forma importante: ya no se trata de elegir la opción más barata entre varias viables, sino de encontrar la mejor opción **dentro del subconjunto que no necesita a nadie mirando casos uno por uno**.

## La pregunta bien planteada

"¿Es ML la solución?" mezcla dos preguntas distintas:

1. ¿Hace falta **aprender de los datos de uso** en vez de depender 100% de que alguien etiquete a mano? — Sí, sin duda, es el problema real descrito en [00-current-state.md](./00-current-state.md). Y como no hay presupuesto de tiempo humano para etiquetar caso por caso, ese aprendizaje **tiene que ser automático desde el diseño**, no una versión más eficiente del etiquetado manual.
2. ¿Hace falta **entrenar un modelo** (ajustar pesos con datos) para lograrlo? — Depende de si la ingeniería basada en datos (agregación automática, sin entrenar nada) alcanza sola. La respuesta de este documento: probablemente no del todo, y por eso ML real queda en el mapa desde el principio, no como último recurso.

## Dos cosas que veníamos llamando "lo mismo" sin serlo

**Ingeniería basada en datos** (lo que [01-feedback-signal.md](./01-feedback-signal.md) y [02-clustering.md](./02-clustering.md) diseñan): juntar feedback real, agruparlo, y usar ese agregado para elegir mejores ejemplos dentro del mismo prompt que ya existe — todo el proceso corre solo, sin que nadie decida caso por caso. Nada de esto ajusta pesos de ningún modelo. Es el mismo tipo de trabajo que ya hace cualquier sistema de reglas con contadores. Lo puede construir el equipo actual, con el stack actual, sin contratar a nadie nuevo, y **sin que nadie tenga que dedicarle tiempo operativo después de construirlo** — la diferencia clave frente a un panel de revisión.

**Aprendizaje automático real** (Fase 2 y Fase 3 de [06-ml-roadmap.md](./06-ml-roadmap.md)): un modelo estadístico o una red que aprende un ajuste a partir de datos. Esto sí es ML de verdad, y sí necesita volumen de datos y una forma seria de medir si funciona — pero, igual que la ingeniería basada en datos, una vez entrenado y desplegado **corre solo**, sin que nadie revise resultados uno por uno.

Ambos caminos comparten la propiedad que hace falta acá: escalan sin sumar trabajo humano recurrente. La diferencia entre ellos es cuánto de la lógica queda explícita/auditable (ingeniería basada en datos) contra cuánto queda aprendido dentro de un modelo (ML real) — no es una diferencia de "cuánta gente hace falta para operarlo", en ninguno de los dos casos hace falta gente operándolo caso por caso.

## Tres caminos, sin panel de revisión humana en ninguno

| Camino | En qué consiste | Costo/esfuerzo | Riesgo | Necesita a alguien revisando casos a mano? |
|---|---|---|---|---|
| **1. Reglas explícitas (oportunistas, no un proceso)** | Extender el patrón que ya existe (`occasionCeiling`, ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#techo-de-ocasión-occasionceiling)): cuando alguien del equipo *nota* un error sistemático (mirando métricas agregadas, no revisando casos individuales), se escribe una regla dura en código | Bajo | Bajo — cada regla se puede leer y probar | No — es un cambio de código puntual y ocasional, no una cola que alguien atiende |
| **2. Ingeniería de datos automática (plan principal)** | Agrupar outfits por similitud (clustering por tags), calcular de forma 100% automática qué ejemplos mostrarle al LLM según el feedback agregado, con piso mínimo estadístico y ajuste gradual (shrinkage) para que pocos votos no distorsionen nada — ver [01-feedback-signal.md](./01-feedback-signal.md) y [02-clustering.md](./02-clustering.md) | Medio (~5-7 semanas-persona, ver [07-implementation-plan.md](./07-implementation-plan.md)) | Medio — más piezas para mantener, pero cada ajuste es auditable después del hecho (se puede ver por qué el sistema decidió lo que decidió) | No — el piso mínimo y el shrinkage son los que evitan que pocos usuarios distorsionen el score, reemplazando lo que antes hacía un humano criterioso |
| **3. Aprendizaje automático real** | Fase 2 (ajuste estadístico aprendido) o Fase 3 (modelo/fine-tuning propio, ver Opción B' en [06-ml-roadmap.md](./06-ml-roadmap.md)) | Alto | Alto al principio (poco volumen, menos explicable, necesita auditoría de sesgo seria) | No — pero necesita más trabajo previo (curar datos de entrenamiento) para no depender de un humano corrigiendo en producción |

## Recomendación honesta

**El Camino 2 (ingeniería de datos automática) es el plan principal.** Es la única opción, de las tres, que resuelve el problema real (aprender de uso real sin curación manual caso por caso) con una complejidad que el equipo actual puede construir y — más importante dado el descarte del panel humano — **mantener sin dedicarle tiempo operativo recurrente**. El piso mínimo de muestras y el ajuste gradual (`peso = n / (n + k)`, ver [01-feedback-signal.md](./01-feedback-signal.md#evitar-que-pocos-usuarios-distorsionen-el-score-de-todos)) cumplen automáticamente el rol que antes se le había asignado a un panel de personas: evitar que un grupo chico de votos mueva el score de todos. La diferencia es que esto corre en cada request, sin que nadie lo dispare a mano.

**El Camino 1 (reglas explícitas) es un complemento barato, no un proceso separado.** No compite en el tiempo con el Camino 2 — es simplemente: cuando alguien del equipo, mirando el dashboard de métricas (no una cola de casos), nota un patrón sistemático obvio (ej. "los outfits con tal combinación de accesorios siempre reciben score bajo pese a buen feedback"), lo codifica como regla. Es opcional, esporádico, y no bloquea nada si nunca pasa.

**El Camino 3 (ML real) queda en el mapa desde ahora, no como última instancia teórica.** A diferencia de la versión anterior de este documento, acá no hay un "Camino 2 barato" que absorba la mayor parte del problema — así que es más probable que la ingeniería basada en datos sola no alcance para capturar patrones sutiles (ej. la diferencia cultural CABA/Beijing que motivó esta investigación, ver [05-alternatives-and-tradeoffs.md](./05-alternatives-and-tradeoffs.md)). Vale la pena empezar a evaluar la Opción B' (fine-tuning gestionado, ver [06-ml-roadmap.md](./06-ml-roadmap.md#opción-b--fine-tuning-gestionado-sobre-el-mismo-modelo-que-ya-usamos)) en paralelo al Camino 2, no después — es barata de probar con los datos que ya existen (`labels.json` + `scoring_examples`) y no depende de que el Camino 2 "falle" primero para justificarse.

## Cuándo el aprendizaje automático real pasa de "en el mapa" a "hace falta ya"

Criterios concretos y falsificables:

- Después de aplicar reglas explícitas (Camino 1) a los patrones más obvios, la tasa de desacuerdo (ver [10-acceptance-criteria-and-testing.md](./10-acceptance-criteria-and-testing.md#números-a-mirar-en-el-tiempo-no-son-criterios-de-una-fase-puntual-son-la-brújula-de-todo-el-esfuerzo)) deja de bajar con el Camino 2 solo — señal de que quedan patrones demasiado sutiles para capturar con clustering por tags y ejemplos dinámicos.
- Una prueba barata de la Opción B' (fine-tuning gestionado) con los datos ya existentes muestra una mejora medible sobre el Camino 2 — en ese caso no hace falta esperar a que el Camino 2 llegue a su techo, ya hay evidencia concreta de que vale la inversión.
- El costo de seguir llamando al LLM en cada análisis se vuelve un problema real de negocio a la escala que tiene la app (hoy no hay ni el volumen ni el dato de costo real para evaluar esto, ver [00-current-state.md](./00-current-state.md#escala-actual)).

## El riesgo de vender "IA que aprende" sin que sea necesario

Vale la pena decirlo directo: hay una presión real, en cualquier producto con IA, de mostrar hacia afuera "un modelo que aprende solo" porque suena mejor que "un ajuste estadístico con piso mínimo" — aunque técnicamente las dos cosas sean "el sistema aprende de datos reales sin intervención manual". Esta investigación no debería dejarse llevar por esa presión ni tampoco subestimar el Camino 2 solo porque suena menos vistoso que "ML real". Si se construye el Camino 3, que sea porque los criterios de arriba se cumplieron o porque una prueba barata mostró mejora concreta — no porque "IA que aprende" es una mejor historia para contar.

## Qué cambia en lo ya escrito en esta carpeta

[01-feedback-signal.md](./01-feedback-signal.md), [02-clustering.md](./02-clustering.md) y [06-ml-roadmap.md](./06-ml-roadmap.md) siguen siendo válidos casi sin cambios — ya estaban diseñados como mecanismos 100% automáticos, sin panel humano. Lo que cambia:

- El feedback explícito (ver [01-feedback-signal.md](./01-feedback-signal.md)) vuelve a tener el rol que tenía antes de la primera versión de este documento: **es el dato que calibra el ajuste automático directamente**, no un insumo para que alguien decida a mano. El piso mínimo y el shrinkage son la única red de seguridad — no hay una capa humana adicional revisando antes de que el ajuste se aplique.
- [05-alternatives-and-tradeoffs.md](./05-alternatives-and-tradeoffs.md) ya no lista un panel de revisión humana como alternativa — queda descartado por la restricción de tiempo del equipo, no por ser una mala idea en abstracto.
- [07-implementation-plan.md](./07-implementation-plan.md) debería mantener el orden original: clustering + selección dinámica de few-shot es la Fase 1, sin una fase previa de "cola priorizada" que ya no existe.
- El reto diario (ver [08-daily-challenge.md](./08-daily-challenge.md)) cambia de propósito: ya no "escala una cola de revisión humana" — alimenta directamente el piso mínimo estadístico del Camino 2, generando volumen de feedback más rápido para que los clusters crucen el umbral `N` antes.

## Riesgo que hay que vigilar de cerca al sacar el humano del medio

Sin nadie revisando casos individuales, ningún error puntual se corrige a mano — todo depende de que el diseño estadístico (piso mínimo, shrinkage, auditoría de equidad periódica sobre métricas agregadas) funcione bien desde el principio. Esto sube la exigencia sobre:

- **La auditoría de equidad** (ver [10-acceptance-criteria-and-testing.md](./10-acceptance-criteria-and-testing.md#equidad-la-auditoría-que-hay-que-pasar-antes-de-producción)) deja de ser "una capa extra de cuidado" y pasa a ser el único freno contra sesgo sistemático — tiene que correr sobre métricas agregadas de forma periódica (ej. mensual), no depender de que alguien "note algo raro" mirando casos sueltos.
- **El interruptor de apagado** (rollback a `scoring_examples` estático) se vuelve más importante todavía — si el ajuste automático empieza a comportarse mal, no hay un humano en el loop que lo frene caso por caso; hace falta poder desactivarlo globalmente en minutos.

## Open questions

- ¿Cuánto presupuesto (tiempo o dinero) tiene sentido destinar a probar la Opción B' (fine-tuning gestionado) en paralelo al Camino 2, dado que ya no hay una fase intermedia barata que la reemplace?
- ¿Con qué frecuencia corre la auditoría de equidad sobre métricas agregadas para que siga siendo el freno real sin depender de revisión caso por caso? Mismo dato pendiente de volumen real, ver [00-current-state.md](./00-current-state.md#escala-actual).
