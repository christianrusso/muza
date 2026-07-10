# Reto diario: cómo conseguir feedback de la comunidad sin que se sienta como trabajo

Idea del equipo: un "reto diario" que invite a la gente a opinar sobre outfits, para juntar feedback de comunidad de forma constante. Este documento la conecta con lo ya investigado: es la forma de generar volumen para el **Camino 2** (ingeniería de datos automática) de [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md) — sin ningún panel humano decidiendo nada, el reto simplemente acelera que los clusters de [01-feedback-signal.md](./01-feedback-signal.md) crucen el piso mínimo estadístico más rápido, de forma que se sienta como un juego, no como trabajo de etiquetado gratis.

## Qué es, en una oración

Cada día, la app le muestra a cada usuario 3 outfits para opinar (👍/👎 + "¿por qué?" opcional), priorizando los casos donde el score de la IA y el feedback de otros usuarios más discrepan (ver [01-feedback-signal.md](./01-feedback-signal.md)) — y a cambio, el usuario ve cómo su opinión se comparó con la del resto apenas termina.

## Por qué esto encaja mejor que las alternativas ya evaluadas

[03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md) ya proponía mostrarle a la gente outfits de otros para reaccionar, pero como una recomendación pasiva dentro del feed. El reto diario le da a esa misma idea una razón para volver todos los días — el mecanismo de retención que falta en esa versión. Y como los ítems del reto se eligen priorizando los casos de mayor desacuerdo (no al azar ni solo "según tu gusto"), cada voto vale más para el objetivo real: que los clusters con más incertidumbre junten volumen más rápido, no solo generar entretenimiento.

## Cómo se arma el reto de cada día

1. Un proceso automático (batch, corre una vez al día) junta los análisis donde el feedback de calibración (ver [01-feedback-signal.md](./01-feedback-signal.md)) está más dividido, o donde el score de la IA y la opinión de quien subió la foto no coinciden.
2. De esa lista, elige 3 para el reto del día — priorizando variedad de ocasión y evitando repetir el mismo outfit dos días seguidos.
3. **Mitigación del efecto halo, no opcional**: la foto que se muestra en el reto se recorta o difumina la cara, igual que ya propone [01-feedback-signal.md](./01-feedback-signal.md#recomendación-separar-señal-social-de-señal-de-calibración-y-empezar-solo-con-auto-reporte) para cualquier feedback de terceros. El reto pide opinar sobre la ropa, no sobre la persona — hay que diseñarlo para que sea literalmente imposible responder "me gusta esta persona" por error. Límite relacionado, no negociable: el reto **nunca** pregunta qué debería cambiarse o usarse distinto — solo "¿te parece justo este puntaje?". Pedirle a un tercero que sugiera qué le quedaría mejor a otra persona es un juicio de estilo todavía más expuesto al efecto halo que puntuar — ver [09-recommendations-feedback-loop.md](./09-recommendations-feedback-loop.md#regla-dura-nunca-pedirle-a-un-tercero-que-opine-sobre-qué-debería-usar-otra-persona).
4. El outfit del reto **no** dice de entrada qué score le puso la IA — se pregunta primero la opinión del usuario, y recién después (ver más abajo) se le muestra cómo se comparó. Preguntar la opinión ya sabiendo el score de la IA sesga la respuesta hacia estar de acuerdo (anclaje).

## La recompensa: por qué alguien vuelve mañana

- **Revelar el resultado apenas termina el reto**: "3 de cada 5 personas coincidieron con vos" o similar — la curiosidad de saber si "acertaste" es el gancho principal, no un premio material.
- **Racha (streak)**: contador de días seguidos participando, visible en el perfil. Es el mecanismo de retención más simple y más probado en apps de hábito diario (Wordle, Duolingo, etc.) — no hace falta inventar nada más sofisticado para la v1.
- **Sin leaderboard en la v1**: comparar puntajes entre usuarios suma complejidad social (quién gana, quién queda último) sin que hoy haya evidencia de que hace falta para retener. Se puede evaluar más adelante si la racha sola no alcanza.
- **Sin premio económico en la v1**: mantenerlo simple. Si más adelante hay plan pago, un beneficio chico (ver la sección de monetización) puede sumarse, pero no es necesario para lanzar.

## Modelo de datos (propuesta inicial, a validar en la spec)

- **`daily_challenge`**: `id`, `challenge_date` (única por día), `created_at`.
- **`daily_challenge_items`**: `challenge_id → daily_challenge`, `analysis_id → analyses`, `sort_order`. 3 filas por día.
- **`daily_challenge_responses`**: `item_id → daily_challenge_items`, `user_id → profiles`, `agree boolean`, `reason text` opcional, `created_at`. Restricción: un usuario, una respuesta por ítem — mismo patrón que ya usa `post_reactions`.
- **Racha**: se puede calcular al vuelo (contar días seguidos con al menos una respuesta) en vez de guardar un contador aparte — más simple y sin riesgo de que quede desincronizado.

Esto reusa el mismo mecanismo de feedback de [01-feedback-signal.md](./01-feedback-signal.md) (piso mínimo, ajuste gradual, un voto por usuario) — el reto diario es una forma nueva de **recolectar** esa señal, no una señal distinta con sus propias reglas.

## Cómo se conecta con el resto de la iniciativa

- Las respuestas del reto entran directo al mismo agregado automático del **Camino 2** (clustering + few-shot dinámico, ver [02-clustering.md](./02-clustering.md) e [04-is-ml-the-right-answer.md](./04-is-ml-the-right-answer.md)) — sin ninguna persona decidiendo qué hacer con ellas. Ya están en el formato correcto porque comparten el mismo mecanismo de feedback que [01-feedback-signal.md](./01-feedback-signal.md) define, y quedan sujetas al mismo piso mínimo `N` y ajuste gradual antes de influir en algo.
- Su único propósito operativo es acelerar el tiempo hasta que cada cluster junte suficiente volumen — el reto no crea un camino de datos nuevo, multiplica la velocidad del que ya existe.

## Monetización: dónde podría entrar un plan pago, sin bloquear el reto en sí

El reto diario tiene que quedar **disponible para todos los planes** — es la fuente principal de la señal que mejora el producto para todos, restringirlo a usuarios pagos reduciría justo el dato que hace falta juntar. Ideas de beneficio pago, sin condicionar la participación:

- Ver estadísticas más detalladas de tu historial de participación (cuántas veces coincidiste con la comunidad, por ejemplo) — información extra, no acceso al reto en sí.
- Rachas más largas podrían dar acceso a features ya reservadas para plan pago (ej. `canSimulate`, ver [08-open-decisions.md](../general-app-research/08-open-decisions.md#feature-simulación-ia)) como premio, no como requisito.

## Casos de prueba y criterios de aceptación

Sigue el mismo formato que [10-acceptance-criteria-and-testing.md](./10-acceptance-criteria-and-testing.md).

**Criterios de aceptación**:
- Todos los días hay un reto nuevo con 3 ítems, elegido antes de que el primer usuario lo vea (el proceso automático corre antes del horario de mayor uso).
- Un usuario no puede responder dos veces el mismo ítem.
- La cara de la persona en la foto no es reconocible en la pantalla del reto (recorte o difuminado aplicado siempre, no opcional).
- El reto se puede completar sin haber dado feedback antes en ningún otro análisis — no depende de historial previo del usuario.

**Casos de prueba**:
- Un mismo outfit no aparece dos días seguidos en el reto (evitar fatiga/repetición).
- Si no hay suficientes análisis con desacuerdo ese día, el reto se completa con análisis al azar en vez de fallar o quedar vacío — hace falta un camino de respaldo, no asumir que siempre va a haber suficientes casos de desacuerdo.
- Un usuario que borra su cuenta → sus respuestas al reto se borran en cascada, mismo patrón que el resto de los datos de usuario (ver [12-legal-and-privacy.md](./12-legal-and-privacy.md)).
- **Caso adversarial**: alguien crea varias cuentas para inflar su propia racha o para votar varias veces sobre el mismo ítem → cubierto por el mismo mecanismo de "menos peso a cuentas nuevas o con patrón raro" ya anotado en [01-feedback-signal.md](./01-feedback-signal.md#evitar-que-pocos-usuarios-distorsionen-el-score-de-todos) — no hace falta un mecanismo nuevo, solo aplicar el mismo ahí.

## Open questions

- ¿El reto es una pantalla separada, una tarjeta en el home, o una notificación push diaria? Es una decisión de [ux-growth](../ux-growth/README.md), no de este documento — este documento define el qué y el por qué, no el cómo se ve.
- ¿Qué pasa si un usuario participa del reto pero nunca subió su propia foto? ¿Puede seguir participando igual? Probablemente sí (ayuda a la señal de todas formas), pero vale confirmarlo como decisión de producto.
- ¿Cuántos días de racha hacen falta para que se sienta "logrado" sin ser tan largo que desaliente a alguien que se lo perdió una vez? No hay dato propio para esto — mirar referencias de otras apps de hábito diario antes de definir un número.
