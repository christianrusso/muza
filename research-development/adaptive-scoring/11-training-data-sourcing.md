# De dónde salen las fotos para entrenar o calibrar

> **En resumen**: la mejor fuente de datos son las propias fotos y feedback de los usuarios reales — pero usarlas para calibrar el modelo (no solo para mostrar el resultado, como hoy) requiere primero actualizar la Política de Privacidad. Bancos de fotos externos (DeepFashion, Unsplash, etc.) quedan como plan B lejano, solo si hace falta más volumen para un modelo propio — casi todos tienen licencia académica, no comercial, y no resuelven el derecho de imagen de la persona fotografiada.

## Lo que ya se usa hoy, de forma informal

`scripts/eval/labels.json` tiene fotos con nombres de archivo como `andrea-cipriani-RthWUusZL4Q-unsplash.jpg` — ese patrón de nombre muestra que se bajaron a mano de **Unsplash** para armar el set de prueba local del harness de evaluación (`scripts/eval/run.ts`). Se usan solo para probar el prompt/modelo en local, no en producción, y no para entrenar un modelo propio (hoy no existe un modelo propio, ver [06-ml-roadmap.md](./06-ml-roadmap.md)).

`scripts/seed-photos.mjs` usa Lorem Picsum (fotos genéricas al azar) para darle una imagen a usuarios de prueba — no son fotos de outfits reales, sirven solo para que la comunidad tenga algo para mostrar en desarrollo. No aportan valor como dato de entrenamiento.

## La mejor fuente: el contenido de los propios usuarios

`analyses.photo_path` + `community_posts`, junto con el feedback explícito propuesto en [01-feedback-signal.md](./01-feedback-signal.md), son justo lo que hace falta: gente real subiendo su outfit real para una ocasión real, con una señal de si el juicio fue acertado o no. Es la fuente con más valor y sin licencia de terceros de por medio.

Antes de usarla para entrenar o calibrar (no solo para mostrar en la app, como hoy) hace falta:

- Actualizar la Política de Privacidad para contar esta finalidad nueva (ver [12-legal-and-privacy.md](./12-legal-and-privacy.md)) — es el freno principal, no es un tema técnico.
- Definir si es "opt-in" (el usuario tiene que aceptar de forma explícita, más lento pero más seguro legalmente) u "opt-out" (activado por defecto, con opción de desactivarlo) — esto lo tiene que resolver un abogado, no este documento.

## Bancos de fotos de fashion públicos (si hace falta más volumen para arrancar un modelo propio — Fase 3)

Solo importa si se llega a evaluar la Opción B de [06-ml-roadmap.md](./06-ml-roadmap.md) y el volumen propio no alcanza para arrancar. No se evaluaron en profundidad, quedan solo listados como punto de partida para más adelante:

| Set de datos | Qué tiene | Licencia (a confirmar en cada caso) |
|---|---|---|
| DeepFashion / DeepFashion2 | ~800 mil fotos de prendas y outfits, con atributos | Uso académico por defecto — pide permiso a los autores para uso comercial |
| Fashionpedia | Fotos con detalle muy fino de prendas y atributos | Licencia académica (CC BY-NC), no sirve para uso comercial sin un acuerdo aparte |
| iMaterialist Fashion (Kaggle) | Cientos de miles de fotos con anotaciones de prendas | Depende de la edición — revisar los términos de Kaggle y del set puntual |
| Polyvore Outfits | Combinaciones de prendas armadas, pensado más para "esto combina" que para puntuar una foto real | Uso académico |
| ModaNet | Fotos de calle con las prendas marcadas | Uso académico |

**Patrón general**: la gran mayoría de estos sets de datos de fashion son de uso académico por defecto. Usarlos en un producto que en algún momento va a cobrar (`PRO_MONTHLY_PRICE_USD_PLACEHOLDER`, ver [08-open-decisions.md](../general-app-research/08-open-decisions.md)) sin pedir permiso es un riesgo de licencia real, no solo un detalle.

## Bancos de fotos con licencia comercial (Unsplash API, Pexels, etc.)

Sirven para sumar variedad visual (por ejemplo, más diversidad de cuerpos, edades, lugares en el set de prueba), pero con dos límites:

- La licencia de la **foto** (derecho de autor) no es lo mismo que el **permiso de la persona fotografiada** para que su imagen se use en un producto que evalúa cómo se viste — ver [12-legal-and-privacy.md](./12-legal-and-privacy.md#derecho-de-imagen-de-terceros). La mayoría de estos bancos no garantizan ese permiso para este uso puntual.
- No se sacaron en el contexto real del producto (alguien evaluando a propósito si su outfit es adecuado para una ocasión) — su valor como dato de entrenamiento para este negocio en particular es limitado. Sirven más para probar el pipeline técnico (¿la validación de foto funciona con distintos encuadres y luces?) que para calibrar el criterio de moda en sí.

## Riesgos, en resumen

- **Derecho de imagen de personas reconocibles** — distinto del derecho de autor de la foto (ver [12-legal-and-privacy.md](./12-legal-and-privacy.md)).
- **Sesgo geográfico** — la mayoría de estos sets de moda pública tiene mucha más moda occidental (EE. UU./Europa). Usarlos sin cuidado puede meter justo el sesgo cultural que esta investigación busca evitar (ver [02-clustering.md](./02-clustering.md#lo-que-esto-no-resuelve-el-contexto-cultural-o-geográfico)).
- **Costos de licencia** — la mayoría es gratis para investigación, pero puede pedir un acuerdo comercial pago. No se cotizó acá, caso por caso si se llega a necesitar.

## Open questions

- ¿El volumen propio (con permiso explícito) alcanza para la Fase 1/2, o hace falta un set externo desde antes? Depende de la escala real (ver [00-current-state.md](./00-current-state.md#escala-actual)).
- Si se usa un set de datos público más adelante, ¿quién revisa la licencia puntual antes de aprobarlo? Es una decisión de quién manda en el proyecto, no algo técnico — conviene definir quién es responsable antes de que haga falta.
