# Qué señal usar para calibrar, y cómo evitar que pocos usuarios la distorsionen

> **En resumen**: no usar los likes/dislikes que ya existen (mezclan popularidad y atracción con si la ropa es adecuada). En su lugar, sumar un mecanismo nuevo y chico — "¿te parece justo este puntaje?" — que cada uno responde solo sobre su propio resultado, para minimizar el efecto halo (juzgar la ropa por cómo te cae la persona). Un piso mínimo de respuestas y un ajuste gradual evitan que 2 o 3 votos distorsionen el score de todos.

## El problema de fondo: un like no es lo mismo que "el score está bien"

`community_posts` muestra la foto **junto con el `overall_score`** que ya se calculó. Cuando alguien da like o dislike, puede estar respondiendo a varias cosas distintas, todas mezcladas:

- si le gusta el outfit,
- si le gusta la persona de la foto,
- si está de acuerdo con el score que vio,
- o simplemente si el post es popular en ese momento.

Si usamos ese like/dislike crudo para calibrar el modelo, mezclamos señal (¿la ropa es adecuada?) con ruido (popularidad, atracción). Además, en cuanto el like empieza a mover el score, la gente puede coordinarse para inflarlo o hundirlo a propósito. Deja de medir lo que queremos medir.

## El efecto halo: te puede gustar la persona, no el outfit

Hay un nombre para este problema en psicología: **efecto halo**. Es el sesgo por el cual, si algo de una persona nos cae bien (su cara, su cuerpo, su carisma en la foto), tendemos a evaluar mejor *todo lo demás* sobre ella — incluida su ropa. Y al revés: si algo nos genera rechazo, tendemos a puntuar peor todo el paquete, sin darnos cuenta.

Esto no es un caso raro. Es el comportamiento por defecto de cualquier persona mirando una foto de otra persona. El propio prompt que usa la IA hoy ya se cuida de esto de forma explícita: le pide que analice **solo la ropa, nunca el cuerpo o la cara** (ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md)). Un humano no tiene esa instrucción interna. No podemos simplemente "pedirle" a alguien que ignore lo que siente al mirar una foto — el efecto halo es en gran parte automático, no una elección consciente.

Esto importa mucho para el diseño de esta sección, porque cambia según **quién** da el feedback:

- **Vos evaluando tu propia foto**: el efecto halo casi no aplica (no te vas a atraer o rechazar a vos mismo). Sí puede aparecer otro sesgo distinto — querés creer que tu outfit está bien, o al revés, sos muy autocrítico. Es un sesgo real, pero más chico y más fácil de promediar con volumen.
- **Otra persona evaluando tu foto**: acá el efecto halo pega fuerte. Si en algún momento mostramos outfits de otros usuarios para que la gente reaccione (ver [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md)), esa reacción va a estar mezclada con qué tan atractiva le resultó la persona, no solo la ropa.

## Recomendación: separar señal social de señal de calibración, y empezar solo con auto-reporte

**No usar like/dislike de `post_reactions` para calibrar el modelo.** Se deja como está — señal social, solo ordena el feed (tab "Popular").

**Agregar un mecanismo nuevo y chico**, pensado solo para calibrar: algo como "¿Te parece justo este puntaje?" (👍/👎 + un motivo corto, opcional), que aparece cuando alguien ve **su propio** resultado (`analysis/[id]/result`) — antes de decidir si publica o no a la comunidad. Por qué así:

- La pregunta es sobre el score puntual, no sobre el outfit en general → señal más limpia.
- Se pide en el momento de más contexto (recién leíste el desglose por categoría), no días después mirando el feed.
- No depende de publicar a comunidad (eso es opcional hoy) → llega a mucha más gente.
- **Al ser auto-reporte, casi no tiene efecto halo** (ver sección anterior) — es la razón principal, más allá de la calidad de la señal, para arrancar así en vez de pedirle a otros usuarios que puntúen fotos ajenas.

Si más adelante se decide sumar una segunda fuente de señal donde otros usuarios evalúan fotos ajenas (para tener más volumen, o para la función de recomendación de [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md)), esa fuente **necesita su propia mitigación del efecto halo** — no alcanza con reusar este mismo mecanismo. Una opción concreta: mostrar la foto recortada o con la cara difuminada solo quien está calificando para calibración (no para el feed social, ahí la foto completa tiene sentido). No es una solución perfecta — el efecto halo también puede colarse por postura, cuerpo o contexto de la foto, no solo la cara — pero reduce el problema en vez de ignorarlo.

## Evitar que pocos usuarios distorsionen el score de todos

Este es un pedido explícito: con pocos usuarios, la opinión de 1 o 2 personas no puede mover mucho cómo se puntúa a todos los demás. Formas de lograrlo (se pueden combinar):

1. **Piso mínimo de muestras por grupo** (cluster + ocasión, ver [02-clustering.md](./02-clustering.md)): un grupo no empieza a influir en el scoring hasta juntar `N` respuestas (ej. 20-50, número real a definir con datos de escala — ver [00-current-state.md](./00-current-state.md#escala-actual)). Antes de eso, se usa el comportamiento de hoy (banco `scoring_examples` curado a mano).
2. **Acercar el ajuste al promedio general cuando hay pocos datos**: en vez de "todo o nada" al cruzar el piso, el peso del ajuste crece con la cantidad de muestras. Con pocas muestras, el ajuste es casi nulo; con muchas, se acerca al valor calculado (fórmula tipo `peso = n / (n + k)`, donde `k` es "cuántas muestras hacen falta para confiar"). Es la misma idea que usan sitios como IMDb para no dejar que una película con 3 votos de 10 le gane a una con 50.000 votos de 8.
3. **Un voto de calibración por usuario por análisis** — mismo constraint de base de datos que ya existe hoy para `post_reactions` (`unique(post_id, user_id)`).
4. **Menos peso a cuentas nuevas o con patrón raro de actividad** — para frenar coordinación de cuentas falsas. Esfuerzo alto, no hace falta para una v1 con pocos usuarios (el riesgo de abuso crece con el volumen, no con el solo hecho de tener el mecanismo). Se anota como algo para más adelante, no bloqueante ahora.

## Fuera de alcance de este documento

Esto es sobre calibrar el **score**. Las sugerencias de mejora (`improvements`/`recommendations` que ya devuelve el modelo) tienen su propio mecanismo de calibración y su propio riesgo de efecto halo — ver [09-recommendations-feedback-loop.md](./09-recommendations-feedback-loop.md).

## Open questions

- ¿Dónde vive el número `N` y la constante `k`? ¿Hardcodeado, en una tabla de configuración, o distinto por ocasión (algunas van a tener mucho menos volumen que "casual")?
- ¿El feedback de calibración se le muestra a quien lo dio (ej. "gracias por tu opinión") o queda silencioso?
- Si más adelante se suma feedback de terceros (otros usuarios puntuando fotos ajenas), ¿cómo se audita si ese feedback correlaciona con qué tan "atractiva" resultó la foto en vez de con la ropa? Ver caso de prueba en [10-acceptance-criteria-and-testing.md](./10-acceptance-criteria-and-testing.md).
