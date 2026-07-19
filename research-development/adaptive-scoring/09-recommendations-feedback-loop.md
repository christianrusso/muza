# Calibrar las sugerencias de mejora, no solo el score

> **En resumen**: las recomendaciones de mejora ("poné un cinturón") hoy no tienen ningún tipo de calibración — nadie audita si son buenas. Se proponen dos señales sin efecto halo: un 👍/👎 del propio usuario, y comparar automáticamente si su próxima foto refleja el cambio sugerido. Regla dura: nunca pedirle a un tercero que opine qué debería usar otra persona — es el juicio más expuesto al efecto halo de toda la iniciativa.

## Lo que ya existe y nadie está calibrando

El schema de salida del scoring (`ScoringResultSchema`, ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#schema-de-salida-srclibaischemats-zod)) ya devuelve, junto con el score, tres campos de texto libre: `strengths`, `improvements`, `recommendations` — la parte de la app que le dice a alguien qué le falta o qué se pondría distinto para mejorar su outfit.

Hoy esto es 100% texto generado por el LLM en la misma llamada que calcula el score, **sin ningún mecanismo de calibración**: a diferencia del score, que al menos tiene el banco `scoring_examples` curado a mano como referencia, las recomendaciones no tienen ejemplos, no tienen reglas, no tienen ningún tipo de feedback que diga si son buenas. Es, en los hechos, el punto más débil de todo el motor — nadie audita si "poné un cinturón" o "cambiá el calzado" es un consejo acertado o solo texto plausible que generó el modelo.

## Por qué no alcanza con reusar tal cual el mecanismo del score

[01-feedback-signal.md](./01-feedback-signal.md) diseña una señal para responder "¿el score fue justo?". Preguntar "¿la recomendación fue útil?" es una pregunta distinta, con un riesgo distinto:

- El score es un juicio sobre algo que ya pasó (esta ropa, en esta foto). La recomendación es una predicción sobre algo hipotético (qué pasaría si cambiara X) — mucho más fácil de evaluar mal, y mucho más difícil de verificar automáticamente sin una segunda foto.
- Evaluar "¿qué le queda bien a esta persona?" está todavía más cargado de gusto personal y atracción que evaluar "¿esta ropa es adecuada para la ocasión?". El efecto halo (ver [01-feedback-signal.md](./01-feedback-signal.md#el-efecto-halo-te-puede-gustar-la-persona-no-el-outfit)) no solo aparece acá — es probablemente **peor** acá, porque "qué deberías usar" se parece mucho más a un juicio estético sobre la persona que "¿este puntaje te parece justo?".

## Regla dura: nunca pedirle a un tercero que opine sobre qué debería usar otra persona

Esto tiene que quedar como límite explícito de diseño, no una omisión: **ninguna feature de esta iniciativa le pide a otro usuario que sugiera o valore qué debería usar una persona distinta**, ni en el reto diario ni en ningún lugar futuro. [08-daily-challenge.md](./08-daily-challenge.md) ya solo pregunta "¿te parece justo este puntaje?" sobre ropa con cara recortada — eso se mantiene así a propósito. Sumar "¿qué le quedaría mejor a esta persona?" como pregunta de terceros reintroduce el efecto halo en su forma más fuerte, justo donde es más difícil de detectar después (es una opinión de estilo, no un número que se pueda auditar contra un ground truth).

## Señales automáticas, sin efecto halo, sin revisión humana

Igual que en [01-feedback-signal.md](./01-feedback-signal.md), el criterio es: solo señal que el propio usuario genera sobre su propio resultado, o señal que se puede medir de forma puramente estructural sin que nadie la juzgue.

**1. Auto-reporte explícito, mismo patrón que el score**: un 👍/👎 chico junto a las recomendaciones ("¿te sirvió esta sugerencia?"), en el mismo momento y pantalla que la pregunta de si el score fue justo. Auto-reporte sobre el propio resultado → mismo argumento de [01-feedback-signal.md](./01-feedback-signal.md#recomendación-separar-señal-social-de-señal-de-calibración-y-empezar-solo-con-auto-reporte): casi no tiene efecto halo porque nadie está juzgando a otra persona.

**2. Señal implícita, y probablemente la más fuerte de las dos: comparar las propias fotos de un usuario en el tiempo.** Si alguien sube un análisis nuevo dentro de una ventana razonable (a definir, ej. 30 días) después de uno con recomendaciones, y los campos estructurados del análisis nuevo (`detected_calzado`, `detected_accesorios`, `detected_colores`, etc. — ya existen, ver [04-data-model.md](../general-app-research/04-data-model.md#análisis-de-outfit)) muestran un cambio que va en la dirección de una recomendación puntual anterior (ej. la recomendación decía "calzado más formal" y el análisis nuevo detecta justo eso), es una señal fuerte de que la recomendación se siguió — y si además el score subió, de que además funcionó. Esto **no necesita que nadie la evalúe**: es comparar dos campos estructurados del mismo usuario contra sí mismo, sin juicio de terceros de por medio, y sin siquiera necesitar una llamada nueva al LLM para detectarlo (matching sobre tags, no interpretación de texto libre).

## Cómo esto se conecta con el Camino 2 (ingeniería de datos automática)

Mismo mecanismo que ya define [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md) para el score, aplicado a recomendaciones:

- **Agregación por cluster** (mismos clusters de [02-clustering.md](./02-clustering.md)): una vez que un cluster junta suficiente señal (mismo piso mínimo `N` y ajuste gradual que ya define [01-feedback-signal.md](./01-feedback-signal.md#evitar-que-pocos-usuarios-distorsionen-el-score-de-todos)), las recomendaciones con mejor señal (más 👍 y/o más casos de "se siguió y el score subió") para ese tipo de outfit se pueden usar como ejemplo dentro del prompt — el mismo patrón de few-shot dinámico que ya se diseñó para el veredicto, aplicado también a qué tipo de consejo mostrar.
- **Reglas explícitas (Camino 1) tienen más margen acá que en el score**: buena parte de las recomendaciones más comunes son deterministas — si `occasionCeiling` se activó por calzado informal en ocasión formal (ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#techo-de-ocasión-occasionceiling)), la recomendación "cambiá el calzado por algo más formal" no necesita que el LLM la redacte de cero cada vez, puede ser una plantilla determinística disparada por la misma regla que ya limita el score. Esto reduce, de entrada, cuánto texto libre sin calibrar queda dando vueltas — vale la pena mapear qué proporción de recomendaciones de hoy caen en patrones así de predecibles antes de invertir en el camino de aprendizaje automático para esto.

## Qué NO hacer

- No usar la señal implícita (punto 2) como única fuente de verdad sin la explícita — alguien puede cambiar de calzado por una razón que no tiene nada que ver con la recomendación (compró zapatos nuevos, cambió de estación). Es señal de apoyo, no prueba.
- No inferir de la foto nueva ningún dato sobre la persona más allá de lo que ya se detecta hoy (prendas, colores, estilo) — mismo límite que ya aplica al resto de esta carpeta (ver [12-legal-and-privacy.md](./12-legal-and-privacy.md#riesgo-de-discriminación-algorítmica)).

## Open questions

- ¿Cuál es la ventana de tiempo razonable para considerar dos análisis del mismo usuario como "antes/después" de una recomendación? Muy corta pierde casos reales (alguien no compra ropa nueva de un día para el otro); muy larga mezcla cambios que no tienen relación con la recomendación.
- ¿Qué proporción de las recomendaciones que genera el modelo hoy son lo bastante repetitivas como para convertirse en plantillas deterministas (Camino 1)? Hace falta mirar una muestra real de `improvements`/`recommendations` ya generados para tener una idea, antes de invertir en esto.
- ¿El 👍/👎 de recomendaciones es por cada ítem de la lista, o uno solo para el conjunto? Por ítem da señal más precisa pero suma fricción a la pantalla de resultado — a decidir junto con [ux-growth](../ux-growth/README.md).
