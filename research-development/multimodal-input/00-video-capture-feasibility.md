# ¿Se puede puntuar un outfit a partir de un video?

Pregunta concreta: ¿las IA "leen" video? Research hecho en julio 2026 contra la documentación actual de los proveedores — importante porque este es un terreno que cambia rápido, y conviene re-verificar contra la documentación oficial al momento de implementar, no confiar en este documento como fuente definitiva más allá de unos meses.

## Sí, pero no todos los proveedores lo hacen igual

**OpenAI (el proveedor que ya usa LookLab, ver [tech-stack.md](../general-app-research/01-tech-stack.md))**: no tiene entrada de video nativa. Lo que existe es un patrón documentado por el propio OpenAI: extraer frames del video (2-4 por segundo, muestreo uniforme o por detección de frames clave) y mandarlos como una serie de imágenes en el mismo request — es decir, **no es "entender un video", es entender varias fotos seguidas**. Tampoco procesa el audio del video vía la API de visión. [Fuente: OpenAI cookbook — Processing and narrating a video with GPT-4.1-mini](https://developers.openai.com/cookbook/examples/gpt_with_vision_for_video_understanding).

**Google Gemini**: sí tiene entrada de video nativa de verdad — el modelo procesa el video como tal (frames + audio muestreados internamente, ~1 frame por segundo + pista de audio), no hace falta que la app parta el video en imágenes a mano. [Fuente: Google AI for Developers — Video understanding](https://ai.google.dev/gemini-api/docs/pricing).

Conclusión: si se quiere "video real" (no una serie de fotos), **hay que sumar Gemini como segundo proveedor de IA** — hoy el stack entero (`scoreOutfit.ts`, ver [scoring-engine.md](../general-app-research/06-scoring-engine.md)) depende 100% de OpenAI. Esto no es un detalle menor: es una bifurcación real de arquitectura, con dos SDKs, dos formas de facturación, y dos superficies para mantener consistencia de criterio (que un mismo outfit puntúe parecido sin importar qué proveedor lo evaluó).

## El costo real de Gemini, calculado

Contra lo que uno podría suponer, el video nativo de Gemini no es caro. Factura ~300 tokens por segundo de video (258 tokens/frame a 1 fps + 32 tokens/seg de audio):

| Modelo | Precio input | Costo de un video de 15 segundos |
|---|---|---|
| Gemini 2.5 Flash | ~$0.30 / 1M tokens | ~$0.0014 |
| Gemini 2.5 Pro | ~$1.25 / 1M tokens | ~$0.0056 |

**Estos números hay que re-verificarlos contra [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) al momento de implementar** — la lista de modelos y precios de estos proveedores cambia con frecuencia, y este documento va a quedar desactualizado más rápido que el resto de la investigación.

Un dato que sí vale la pena remarcar: a este precio, un video corto puede terminar costando **lo mismo o menos que analizar una sola foto en alta resolución con el flujo actual** — el mito de "el video es carísimo" no aplica necesariamente acá. El costo real a vigilar no es tanto el precio por análisis, es el efecto sobre el patrón de uso (ver [código-y-costo](#lo-que-sí-hay-que-vigilar-el-patrón-de-uso-no-solo-el-precio-unitario) más abajo).

## Dos caminos, no uno solo — y el más barato probablemente alcanza

### Camino A (recomendado para empezar): fotos multi-ángulo, no video de verdad

En vez de pedir un video, pedir 2-3 fotos (frente, perfil, espalda) en la misma captura — mismo flujo de subida que hoy, mismo proveedor (OpenAI), se mandan las 2-3 imágenes en el mismo request de scoring (el patrón de few-shot ya manda varias imágenes en un mismo request, ver [scoring-engine.md](../general-app-research/06-scoring-engine.md#el-prompt-srclibaipromptsscoringpromptts--scoreoutfitts) — no es una capacidad nueva). Esto captura la mayor parte del valor real que motivó la idea del video (ver el fit y la caída de la ropa desde varios ángulos), **sin sumar un proveedor nuevo, sin cambiar el modelo de costos, y sin ningún problema técnico nuevo por resolver**.

- Costo extra: ~2-3x el costo actual de análisis (2-3 imágenes en vez de 1) — previsible, dentro del mismo proveedor.
- Infraestructura: cero nueva. Es una extensión de la pantalla de captura existente (pedir 2-3 fotos en vez de 1) y del prompt (que ya sabe recibir múltiples imágenes).
- Riesgo: bajo — el prompt necesita ajustarse para razonar sobre varias fotos del mismo outfit sin duplicar peso ("no cuentes el mismo problema de fit 3 veces porque aparece en las 3 fotos").

### Camino B: video real vía Gemini, solo si A no alcanza

Vale la pena solo si hay evidencia concreta de que el movimiento/la caída de la tela en movimiento aporta algo que las fotos fijas no capturan — cosas como cómo cae un vestido al caminar, o si un pantalón se ajusta bien al moverse, no solo parado. Es una hipótesis razonable, pero es una hipótesis, no un hecho comprobado — no vale la pena construir el Camino B sin antes confirmar, con el Camino A ya funcionando, que la gente sigue pidiendo algo que las fotos no dan.

- Costo extra: sumar Gemini como proveedor (SDK nuevo, manejo de dos proveedores, prompt equivalente pero adaptado al formato de Gemini), más el costo por análisis (barato, ver tabla arriba, pero variable).
- Infraestructura: nueva — subida de archivo de video (más pesado que una foto, más tiempo de subida en conexiones lentas), y unificar el criterio de scoring entre dos proveedores distintos (mismo outfit, ¿da un puntaje parecido si lo evalúa OpenAI vs. Gemini? — hay que auditar esto, no asumirlo).

## Cómo esto se conecta con la base de conocimiento (clustering), para que sea escalable

Este es el punto que hay que cuidar para que video no termine siendo un sistema aparte: **tanto el Camino A como el B tienen que alimentar el mismo pipeline de tags y clusters que ya existe** (ver [clustering.md](../adaptive-scoring/02-clustering.md)), no uno nuevo.

- El resultado de analizar 2-3 fotos o un video sigue produciendo el mismo `ScoringResultSchema` (`detected_prendas_*`, `detected_colores`, `detected_estilo`, etc. — ver [scoring-engine.md](../general-app-research/06-scoring-engine.md#schema-de-salida-srclibaischemats-zod)). El clustering no necesita saber si el análisis vino de 1 foto, 3 fotos o un video — agrupa por esos mismos tags, sin cambios.
- Esto es, de hecho, el mismo argumento que ya se usó para descartar `pgvector`/embeddings de imagen en el Camino A del clustering (ver [clustering.md](../adaptive-scoring/02-clustering.md#con-qué-tecnología-se-construye)): agregar una fuente de datos más rica (video) no obliga a rediseñar cómo se agrupa, mientras la salida siga siendo el mismo conjunto de tags estructurados.
- Lo único nuevo que aportaría el video de verdad (Camino B) que las fotos no dan es una señal de **movimiento/caída** — si eso resulta valioso, se agrega como un tag más (ej. `detected_caida_tela: buena|regular|mala`), no como un sistema de scoring paralelo.

## Lo que sí hay que vigilar: el patrón de uso, no solo el precio unitario

El riesgo real de negocio no es que un video cueste más por análisis — es que **video (o incluso 3 fotos) tienta a la gente a subir contenido de más baja calidad/duración solo para "probar"**, multiplicando la cantidad de análisis sin multiplicar el valor. Esto ya está anotado como riesgo general en [code-and-infra-improvements.md](../architecture-evolution/00-code-and-infra-improvements.md) (rate limiting por usuario) — video lo hace más urgente, no lo cambia de naturaleza.

## Recomendación

**Empezar por el Camino A (fotos multi-ángulo)**, no por video real. Resuelve la mayor parte del problema (ver el outfit desde varios ángulos) con el proveedor, el costo y la infraestructura que ya existen. Evaluar el Camino B (Gemini, video real) solo si, con datos reales de uso del Camino A, aparece evidencia concreta de que falta la señal de movimiento — mismo principio que ya se usó para ML real en [is-ml-the-right-answer.md](../adaptive-scoring/04-is-ml-the-right-answer.md): no construir la opción cara "porque suena mejor", construirla cuando un criterio concreto la justifique.

## Open questions

- ¿Cuántas fotos (2 o 3) es el punto justo entre "más información" y "más fricción para sacarse fotos"? Necesita probarse con usuarios reales, no se puede resolver en este documento.
- Si se llega a construir el Camino B: ¿el usuario elige subir foto(s) o video, o se reemplaza un flujo por el otro? Probablemente conviven — ofrecer video como opción "avanzada", no reemplazar el flujo simple.
