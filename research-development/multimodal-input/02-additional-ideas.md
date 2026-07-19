# Otras fuentes de información para el perfil de estilo

> **En resumen**: la idea con mejor relación costo/beneficio de toda la carpeta es el **guardarropa digital** (fotografiar cada prenda una vez, armar un catálogo personal) — barato, sin proveedores externos, y conecta directo con mejores recomendaciones. Importar fotos del rollo de cámara es la segunda prioridad. Pinterest, clima/calendario y "guardar look" quedan como ideas menores, para más adelante.

Ideas adicionales a video y redes sociales, evaluadas con el mismo criterio: cuánto valor real agregan contra cuánto riesgo/costo/complejidad suman.

## Guardarropa digital (la idea con mejor relación costo/valor de todas)

El usuario fotografía cada prenda que tiene (una vez, no un outfit completo) y arma un catálogo personal de su ropa. A partir de ahí:

- **Se puede armar el "closet virtual"**: combinaciones entre prendas que la persona ya tiene, sin necesidad de sacarse una foto nueva cada vez.
- **Conecta directo con las recomendaciones** (ver [recommendations-feedback-loop.md](../adaptive-scoring/09-recommendations-feedback-loop.md)): en vez de sugerir genéricamente "un cinturón marrón", puede sugerir una prenda concreta que la persona ya tiene en su guardarropa — mucho más accionable.
- **Es una señal de estilo mejor que un feed social**: un feed social mezcla fotos de outfits con comida, viajes, memes (ver [social-media-integration.md](./01-social-media-integration.md)); el guardarropa es 100% señal relevante, sin necesidad de filtrar nada.

**Por qué esta es la idea a priorizar por sobre video y redes sociales**: no depende de ningún proveedor externo, no tiene riesgo de que una plataforma cierre el acceso de un día para el otro (como pasó con Instagram), no necesita presupuesto de IA nuevo (es fotos + tags, mismo flujo de validación y detección que ya existe), y el valor para el usuario es inmediato y tangible (armar outfits con lo que ya tiene), no una promesa a futuro de "mejor personalización".

- Costo: bajo — reusa el flujo de captura y de detección de prendas que ya existe (`detected_prendas_*`). Lo nuevo es el modelo de datos (una tabla `wardrobe_items` en vez de solo `analyses`) y la UI para navegar el catálogo.
- Riesgo: bajo — mismo tipo de dato (fotos propias, consentimiento ya cubierto) que el resto de la app.

## Importar desde Pinterest (para gustos aspiracionales, no para lo que la persona ya tiene)

Distinto de todo lo anterior: Pinterest no muestra qué usa la persona, muestra **qué le gustaría usar** — señal de gusto/aspiración, no de guardarropa real. La API de Pinterest es, en la práctica, más abierta que Instagram/TikTok para boards públicos (no depende de convertir la cuenta a un tipo comercial), pero igual necesita OAuth y consentimiento del usuario. Vale la pena solo si el objetivo es alimentar la personalización de qué mostrarle (ver [personalization-and-onboarding.md](../adaptive-scoring/03-personalization-and-onboarding.md)), **nunca para calibrar el score** — mismo límite ya establecido ahí, para no mezclar gusto personal con adecuación de la ropa.

## "Guardar este look" desde cualquier sitio (extensión de navegador o compartir desde el celular)

En vez de conectar una cuenta completa (con todo el proceso de revisión de la sección anterior), el usuario comparte manualmente una foto o un link puntual con LookLab — usando el menú "Compartir" nativo del teléfono (que ya sabe mandar una imagen a cualquier app instalada) o una extensión de navegador liviana. Sortea por completo el problema de acceso a APIs de redes sociales: no hace falta el permiso de la plataforma, porque es el usuario compartiendo activamente un contenido puntual, no la app leyendo su cuenta entera.

- Costo: bajo-medio — la parte de "compartir desde el celular" es una integración estándar de plataforma (Share Extension en iOS, Share Intent en Android), no depende de ningún proveedor externo. La extensión de navegador es un desarrollo aparte, más opcional.
- Riesgo: bajo — mismo principio que el guardarropa, dato que el usuario comparte activamente.

## Contexto de clima y calendario (idea más chica, complementaria)

Detectar automáticamente la ocasión sugerida según el clima del día (frío/calor/lluvia) y el calendario del usuario (si está conectado), en vez de que la persona elija la ocasión a mano cada vez. No agrega señal de estilo nueva, pero reduce fricción en el flujo actual de captura. Requiere sumar un proveedor de clima (APIs de clima tienen niveles gratuitos amplios para uso de bajo volumen, costo bajo) y, opcionalmente, acceso al calendario del usuario (mismo tipo de permiso nativo del teléfono que fotos, no una red social).

## Resumen: qué priorizar

| Idea | Valor esperado | Costo/riesgo | Prioridad |
|---|---|---|---|
| Guardarropa digital | Alto — mejora recomendaciones de forma directa y tangible | Bajo | **Primera** |
| Importar desde rollo de cámara (ver [social-media-integration.md](./01-social-media-integration.md)) | Medio-alto — arranca el perfil de estilo rápido | Bajo | **Primera**, en paralelo con guardarropa |
| Fotos multi-ángulo (ver [video-capture-feasibility.md](./00-video-capture-feasibility.md)) | Medio — mejora precisión del score en fit | Bajo | Segunda |
| "Guardar este look" desde cualquier sitio | Medio | Bajo-medio | Segunda o tercera, según feedback de usuarios |
| Contexto de clima/calendario | Bajo-medio — reduce fricción, no agrega señal de estilo | Bajo | Tercera, no bloqueante |
| Pinterest | Bajo-medio, señal distinta (aspiracional) | Medio | Evaluar más adelante, no urgente |
| Video real (Gemini) | Incierto hasta probar el Camino A | Medio-alto | Solo si A no alcanza |
| Instagram/Facebook/TikTok | Bajo hoy (Instagram bloqueado, resto con fricción alta) | Alto | **No priorizar** — ver [social-media-integration.md](./01-social-media-integration.md) |
