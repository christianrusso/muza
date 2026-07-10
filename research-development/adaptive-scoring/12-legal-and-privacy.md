# Legal y privacidad: hasta dónde llega lo que estamos proponiendo

> **Esto es investigación técnica, no asesoramiento legal.** El objetivo es mapear qué preguntas hay que llevarle a un abogado (mejor si es especializado en protección de datos) antes de tocar datos personales — no reemplaza esa consulta.

## Punto de partida: qué dice hoy la Política de Privacidad

Texto real, `src/app/legal/page.tsx` (actualizado el 2026-07-06):

- Datos que se recolectan: cuenta (email, nombre, foto de perfil), **fotos de outfits**, datos de uso (análisis, puntajes, publicaciones, likes, comentarios).
- Las fotos **"se procesan con ese único fin"**: generar el puntaje, usando OpenAI. Dice de forma explícita: *"No usamos tus fotos para publicidad ni las vendemos a terceros"*, y que OpenAI no las usa para entrenar sus propios modelos.
- Cuánto se guarda: mientras la cuenta esté activa; el usuario puede borrar cuenta, análisis o publicaciones cuando quiera.
- Edad mínima: **18 años**, dicho de forma explícita.
- Quién lo opera: **Christian Russo** (persona física — no aparece una empresa constituida en lo que se relevó del repo).

## El problema: nada de esto está previsto hoy

Todo lo que se propone en esta carpeta (feedback explícito, clustering, few-shot dinámico, cualquier modelo propio) implica usar datos de uso — y con el tiempo, las fotos mismas — **para mejorar el algoritmo de scoring**, no solo para generar el puntaje de esa foto puntual. Es un uso distinto al que hoy está declarado, y la política actual no lo cubre.

Antes de activar en producción cualquier parte de [07-implementation-plan.md](./07-implementation-plan.md):

1. **Actualizar la Política de Privacidad** para contar este uso nuevo ("tus datos de uso — reacciones, feedback sobre el puntaje — pueden usarse para mejorar el modelo de scoring").
2. **Decidir si hace falta pedir permiso antes (opt-in) o avisar y dejar la puerta abierta a desactivarlo (opt-out)**: usar datos que ya se juntan hoy (reacciones, feedback) para calibrar el modelo es un cambio más chico que usar **las fotos mismas** para entrenar un modelo propio (Fase 3). Cuanto más se acerque a "entrenar con tu foto", más fuerte el argumento de pedir un permiso explícito, no solo avisar en los términos. Es una decisión legal, no técnica.
3. Si en algún momento se decide usar las fotos mismas (no solo los puntajes o reacciones que salen de ellas) para entrenar, eso es un salto más grande — ver la sección siguiente.

## Las fotos de personas son datos personales (y el límite con datos biométricos)

Una foto de una persona reconocible es un dato personal en casi cualquier marco legal relevante. El diseño actual ya ayuda a acotar el riesgo: el prompt de scoring pide de forma explícita **"analizar EXCLUSIVAMENTE vestimenta (nunca cuerpo/apariencia física)"** (ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#el-prompt-srclibaipromptsscoringpromptts--scoreoutfitts)). Mientras eso se mantenga — el sistema no identifica ni describe a la persona, solo la ropa — se reduce (no se elimina) el riesgo de estar procesando datos biométricos en el sentido más estricto (reconocimiento facial, verificación de identidad).

**Algo a cuidar en cualquier fase futura**: si se entrena un modelo propio o se ajustan coeficientes por cluster, hay que revisar que el resultado siga sin depender de la persona en la foto (cara, cuerpo, color de piel) y solo de la ropa. Es tanto un principio de producto (mantener lo que ya se le promete al usuario) como una forma de quedar lejos de la categoría más regulada de datos: los biométricos.

## Jurisdicción: qué ley aplica dónde

La app está en español-Argentina (`locale es_AR`) y la opera una persona física, según la página legal. En Argentina, los datos personales se regulan con la **Ley 25.326** (con la Agencia de Acceso a la Información Pública como autoridad de control). Pero el ejemplo que arrancó esta investigación fue "alguien en Beijing" — si hay usuarios activos fuera de Argentina, se pueden sumar:

- **GDPR** (Unión Europea) si hay usuarios ahí — exige una razón legal explícita para cada uso de los datos, y usar los datos "para mejorar el modelo" cuenta como algo distinto a usarlos "para generar tu puntaje".
- **CCPA/CPRA** (California) si hay usuarios ahí.
- **PIPL** (China) — particularmente estricta con datos biométricos e imágenes, y con restricciones fuertes para sacar datos de China. Solo importa en serio si hay actividad real de usuarios en China, no como ejemplo hipotético.

**No resuelto en este documento** — depende de dónde estén de verdad los usuarios activos (dato de producto), y de eso depende qué ley(es) aplican. Es la primera pregunta a responder antes de una consulta legal formal.

## Menores de edad

La política ya excluye a los menores de 18, lo cual ayuda si se suma el onboarding de preferencias de [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md). Aun así: pedir **rango de edad** en vez de la fecha de nacimiento exacta (ya así en ese documento) es mejor por pedir lo mínimo necesario — no hace falta saber la edad exacta de nadie, así que no tiene sentido ni pedirla ni guardarla.

## Riesgo de que el algoritmo discrimine

Si el puntaje (en cualquier fase) termina variando de forma sistemática según un cluster que en la práctica se relaciona con género, edad o etnia —aunque esos datos nunca se pidan de forma directa, un modelo de visión puede deducirlos igual de la foto y "filtrarse" en el ajuste—, hay un riesgo legal y de reputación real: un producto que evalúa la apariencia de una persona y termina discriminando sin querer.

Cosas que ya ayudan, y que hay que mantener en cualquier fase futura:

- El puntaje sigue siendo sobre la **ropa**, no sobre la persona (ver la sección anterior).
- [02-clustering.md](./02-clustering.md) ya decidió agrupar por outfit, no por usuario — evita meter el sesgo desde el diseño, en vez de tener que revisarlo después.
- Si se llega a la Fase 2/3 (ajustes calculados con datos), hay que revisar cada tanto si el ajuste por cluster se relaciona con datos protegidos, aunque nunca se hayan usado como dato de entrada.

## Derecho de imagen de terceros

Los Términos de Uso actuales ya piden *"subí solo fotos tuyas o de personas que te dieron permiso"*. Eso cubre la relación entre el usuario y la app para el uso de hoy (generar tu puntaje), pero **no cubre solo** el uso de esas fotos para entrenar o calibrar un modelo — es un uso distinto (ver el problema descrito arriba). Si se usan sets de datos externos, el problema es igual pero peor: ni siquiera hay una relación directa con la persona fotografiada — ver [11-training-data-sourcing.md](./11-training-data-sourcing.md#bancos-de-fotos-con-licencia-comercial-unsplash-api-pexels-etc).

## Open questions / a resolver con un abogado de verdad

- ¿Conviene formar una empresa antes de manejar datos personales a este nivel? Hoy lo opera una persona física, según `/legal`.
- ¿Dónde están de verdad los usuarios activos hoy (qué países)? De eso depende qué ley(es) aplican — es la primera pregunta a resolver, es de producto/datos, no legal.
- ¿Hace falta una persona responsable de datos formal si crece el volumen?
- Escribir, con un abogado, el texto actualizado de la Política de Privacidad **antes** de tocar código de la Fase 1 (ver [00-fase-1-feedback-clustering-fewshot.md](./phases/00-fase-1-feedback-clustering-fewshot.md#11-señal-de-feedback-explícita-1-15-semanas)).
