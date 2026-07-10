# Estado actual: cómo se calibra el scoring hoy

## Dos formas de hacerlo, ninguna conectada con la comunidad

**1. `scoring_examples` (en producción)** — un banco de ejemplos que se carga a mano (ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md#el-prompt-srclibaipromptsscoringpromptts--scoreoutfitts)). Solo `service_role` puede escribir ahí (ver [05-database.md](../general-app-research/05-database.md)). Los ejemplos están filtrados por ocasión, y se le muestran a la IA antes de la foto real, como ejemplo de qué está `ADECUADO ✓` y qué `NO ADECUADO ✗`, con una nota de quien lo cargó. Es lo que hoy le "enseña" al modelo qué es un buen o mal outfit para cada ocasión.

**2. `scripts/eval/labels.json` (fuera de producción)** — un archivo de casi 2900 líneas, etiquetado a mano (`good`/`bad`/`null` + nota), que se usa para probar cambios de prompt, modelo o temperatura antes de subirlos (`npm run eval:ai`). No se usa mientras la app corre en vivo.

**El problema que motiva esta investigación**: las dos formas dependen 100% de que una persona mire la foto y decida. No hay ningún camino que vaya de "un usuario real interactuó con un resultado" a "el modelo se ajustó solo". Etiquetar escala con horas de una persona sentada haciéndolo, no con el uso real de la app.

## Lo que ya existe y podría servir como señal

`community_posts` (cada uno está atado a un `analyses`, que ya tiene su `overall_score`) + `post_reactions` (like/dislike, uno solo por usuario y post) + `post_comments`. El feed (`community_feed_view`) muestra el score junto con la foto — ver [07-flows.md](../general-app-research/07-flows.md#flujo-de-comunidad). O sea: los datos de comunidad ya existen, pero hoy son puramente sociales (ordenan el tab "Popular" del feed) y no tocan el motor de scoring en ningún punto del código.

## Escala actual

No se relevó en este documento. Antes de fijar los pisos mínimos de confianza (ver [01-feedback-signal.md](./01-feedback-signal.md#evitar-que-pocos-usuarios-distorsionen-el-score-de-todos)), hace falta un número real: cuántos usuarios activos, posts y reacciones hay por semana. `admin_metrics()` en `/admin` ya tiene ese dato (ver [05-database.md](../general-app-research/05-database.md)). Sin ese número, cualquier piso que se proponga acá es una suposición a validar.
