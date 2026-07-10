# Onboarding de preferencias y recomendación de qué puntuar

Propuesta que surgió de una charla con Christian: un onboarding más completo (edad, gustos/estilo) para sugerirle a cada usuario **outfits de otras personas para puntuar o reaccionar**, en vez de un feed genérico. La idea tiene dos beneficios: mejor experiencia (mostramos cosas que le interesan a cada uno) y mejor señal de feedback (ver [01-feedback-signal.md](./01-feedback-signal.md)), porque quien puntúa está mirando algo que le importa, no contenido al azar.

## Importante: esto es un eje distinto al de calibrar el score

[02-clustering.md](./02-clustering.md) decidió **no** usar datos personales del usuario para calibrar cómo puntúa el modelo — justo para que el score de alguien no dependa de quién es, sino de la ropa. Esta propuesta no cambia eso: la edad y los gustos que se piden acá **no tocan el cálculo del score**. Se usan solo para decidir **qué outfits mostrarle a cada usuario para que reaccione**. Son dos sistemas separados que comparten datos de entrada, pero no el mismo propósito:

| | Calibrar el score (02-clustering.md) | Recomendar qué mostrar (este doc) |
|---|---|---|
| Agrupa por | outfits parecidos entre sí | gustos del usuario que mira |
| Afecta | qué score recibe un análisis | qué contenido ve un usuario en su feed de "para puntuar" |
| Pide datos sensibles | no (por diseño) | sí (edad, gustos) |

Mantener esta separación es lo que evita el riesgo de sesgo/discriminación de [12-legal-and-privacy.md](./12-legal-and-privacy.md#riesgo-de-discriminación-algorítmica) — a quién le mostramos qué se puede personalizar libremente; cuánto puntos le damos a la ropa, no debería depender de quién la mira.

## El riesgo nuevo que trae esta feature: el efecto halo

Esta función es exactamente el caso donde reaparece el problema descrito en [01-feedback-signal.md](./01-feedback-signal.md#el-efecto-halo-te-puede-gustar-la-persona-no-el-outfit): cuando alguien reacciona a la foto de **otra** persona, esa reacción se mezcla con si le resultó atractiva, no solo con si la ropa es adecuada. Es un sesgo automático (efecto halo), no algo que se arregla pidiéndole a la gente que "sea objetiva".

Depende de para qué se use esa reacción:

- **Si es solo para el feed social** (like/dislike de comunidad, como hoy): no hace falta hacer nada especial, ya es una señal social y se trata como tal.
- **Si esa reacción también se usa para calibrar el score** (alimentar el cluster del outfit con "esto está bien puntuado o no"): ahí sí hace falta una mitigación concreta, porque estaríamos metiendo sesgo por atractivo justo en la parte del sistema que más cuidado tiene en evitarlo hoy. Opción concreta a evaluar: para la versión de la foto que se usa en esta pantalla de calificación, recortar o difuminar la cara (mostrar solo la ropa). Reduce el problema, no lo elimina del todo — el efecto halo también puede venir de la postura o el entorno de la foto, no solo la cara.

**Regla simple para no perder esto de vista**: cualquier feature que le muestre a alguien la foto completa de otra persona y le pida una opinión, hay que preguntarse primero si esa opinión va a tocar el score de alguien. Si la respuesta es sí, hace falta la mitigación de arriba antes de construirla.

## Qué pedir en el onboarding (v1)

- **Rango etario**, no fecha de nacimiento exacta (ej. `18-24`, `25-34`, `35-44`, `45+`). Es el mismo principio que ya sigue este doc en otro lado: pedir lo mínimo necesario. La app ya es 18+ (política de privacidad vigente), así que el rango arranca en 18.
- **Preferencias de estilo**, elegidas de una lista (ej. "casual", "formal", "streetwear", "minimalista" — los mismos tags que la IA ya detecta, ver [04-data-model.md](../general-app-research/04-data-model.md#análisis-de-outfit)).
- Todo **opcional y se puede saltear**. Pedir más de 2-3 preguntas nuevas en el onboarding tiene un costo real: menos gente termina de registrarse. Mejor pedirlo de a poco (una pregunta la primera vez que entra a comunidad, no todo junto en el registro).

Modelo de datos: mejor no agregarlo directo a `profiles`. Este dato cambia distinto a `full_name`/`avatar_url`, así que conviene una tabla separada (ej. `profile_preferences`, 1 a 1 con `profiles`) para poder actualizarlo sin tocar la tabla principal de auth.

## Cómo se usa: recomendar qué puntuar

**V1, simple, sin IA todavía**: filtrar u ordenar los outfits candidatos por si el estilo/ocasión coincide con lo que la persona dijo que le gusta. Es una extensión chica del feed de comunidad que ya existe (`community_feed_view`, ver [07-flows.md](../general-app-research/07-flows.md#flujo-de-comunidad)), no un sistema nuevo desde cero.

**V2, más adelante, si el volumen lo justifica**: sumar señal implícita además de la declarada — el historial real de reacciones de la persona pesa tanto o más que lo que puso en el onboarding. Ahí ya es un sistema de recomendación clásico. Recién tiene sentido con datos reales de uso.

## Los gustos cambian: cómo notar que el perfil quedó viejo

Pedido explícito: de vez en cuando, mostrar algo **fuera** del perfil declarado, para poder notar si los gustos de alguien cambiaron. Es un problema conocido en sistemas de recomendación: hay que elegir entre mostrar más de lo mismo (explotar lo que ya sabemos) o probar cosas nuevas (explorar) para seguir aprendiendo.

Propuesta simple para v1 (sin algoritmos complejos todavía):

1. **Una porción chica es siempre sorpresa**: de todo lo que se le muestra a alguien para puntuar, un 10-15% es a propósito distinto de su perfil (al azar, o rotando categorías que nunca vio). El resto sigue el match con sus preferencias.
2. **Recalcular con el tiempo, no solo confiar en lo que dijo una vez**: cada tanto (ej. una vez por semana, con un proceso automático), recalcular un "perfil real" a partir del historial de reacciones, dándole más peso a lo reciente que a lo viejo. Así, si alguien cambió de gustos hace un mes, el sistema lo nota sin tener que preguntarle de nuevo.
3. **Detectar el cambio**: si el "perfil real" (punto 2) empieza a diferir mucho del que declaró al principio, es señal de que sus gustos cambiaron. Para v1, alcanza con loguearlo (medir cuánta gente se corre de su perfil inicial). Más adelante, se puede usar para actualizar el perfil solo, o para ofrecerle un mini re-onboarding ("¿cambiaron tus gustos? actualizalos").

Esto es a propósito más simple que un sistema de recomendación "de libro". Con el volumen de usuarios actual (ver [00-current-state.md](./00-current-state.md#escala-actual)), algo más sofisticado sería sobre-ingeniería. Vale la pena revisar esta sección cuando haya más escala.

## Open questions

- ¿Se le avisa al usuario que a veces le mostramos algo "fuera de su perfil" a propósito, o queda invisible? Afecta cómo reacciona (si sabe que es "fuera de lo suyo", puede reaccionar distinto que si no lo sabe).
- ¿Cuánto onboarding nuevo se puede agregar sin que baje la conversión de registro? No hay un número de base hoy — habría que medirlo antes y después.
- ¿`profile_preferences` necesita sus propias reglas de acceso (RLS) o alcanza con copiar el patrón de `profiles` (cada uno ve/edita solo lo suyo)? Probablemente lo segundo — confirmar al escribir la spec.
