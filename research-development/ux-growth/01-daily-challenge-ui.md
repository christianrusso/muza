# Dónde vive el reto diario en la navegación

Define el cómo se ve y dónde vive el [reto diario](../adaptive-scoring/08-daily-challenge.md), usando componentes y patrones que ya existen (ver [02-components-and-patterns.md](../design-system/02-components-and-patterns.md)) en vez de inventar un lenguaje visual nuevo.

## Decisión: no agregar una quinta tab

La tab bar hoy tiene 4 ítems fijos (home, history, community, profile) en un canvas de 430px (ver [03-layout-and-responsiveness.md](../design-system/03-layout-and-responsiveness.md)). Sumar un quinto reduce el tamaño de cada ítem y no hay evidencia de que el reto necesite ese nivel de jerarquía permanente — ver la razón completa en [00-retention-and-activation.md](./00-retention-and-activation.md#qué-no-hacer).

## Propuesta: un `.fab` con contador, más una tarjeta en el home

- **Punto de entrada principal**: un botón flotante (`.fab`, ya definido en el sistema — `position: absolute`, `bottom: 100px`, por encima de la tab bar, `z-index: 56`) visible en `home` y `community`, con un contador chico (ej. "3") cuando el reto del día todavía no se completó, y sin contador (o un ícono de check) cuando ya se completó. Mismo patrón visual que un badge de notificación, no hace falta inventar uno nuevo.
- **Refuerzo en el home**: una tarjeta (`Card.tsx` + `.card`) arriba de todo en la tab `home`, con la racha actual ("🔥 5 días seguidos") y una llamada a la acción — visible sin scroll, porque es el momento de mayor intención de uso.
- **La interacción del reto en sí**: un `BottomSheet` (ya existe en `src/components/ui/BottomSheet.tsx`, patrón mobile de modal deslizable desde abajo) con los 3 ítems, uno a la vez o los 3 en un carousel simple — no una pantalla nueva de navegación completa, para que se sienta rápido y liviano, coherente con que el reto tiene que completarse en menos de un minuto.

## Micro-interacción del voto

Sigue el mismo patrón ya establecido para reacciones (`.react` / `.on`, ver [02-components-and-patterns.md](../design-system/02-components-and-patterns.md#otros-patrones-visuales-reutilizables-definidos-solo-en-css-sin-wrapper-de-componente-propio)) — dos botones grandes (👍/👎, mínimo 54px de alto como cualquier `.btn`, ver [03-layout-and-responsiveness.md](../design-system/03-layout-and-responsiveness.md#accesibilidad-y-buenas-prácticas-a-mantener)), con el mismo `transform: scale(0.98)` en `:active` que ya usan los botones existentes. Nada de gestos nuevos (swipe para votar, etc.) — un tap simple, para que responder los 3 ítems sea rápido.

## La foto recortada/difuminada

Requisito de [08-daily-challenge.md](../adaptive-scoring/08-daily-challenge.md#cómo-se-arma-el-reto-de-cada-día): la cara no puede ser reconocible. Visualmente, esto se puede resolver con un recorte de encuadre (mostrar solo de los hombros para abajo) en vez de difuminado — se ve más prolijo y menos "raro" que una cara borrosa, y logra el mismo objetivo. Requiere que el recorte se genere en el mismo momento en que se arma el reto (ver el proceso automático de [08-daily-challenge.md](../adaptive-scoring/08-daily-challenge.md)), no en el cliente.

## El resultado (reveal)

Después de votar los 3 ítems, una pantalla corta (dentro del mismo `BottomSheet`) muestra el resumen: "Coincidiste con la comunidad en 2 de 3" + la racha actualizada. Nada de scores individuales de la IA en este resumen — mostrar "la IA le puso 72 y vos dijiste que no" reintroduce el mismo problema de anclaje que ya se evita en el diseño del reto (ver [08-daily-challenge.md](../adaptive-scoring/08-daily-challenge.md#cómo-se-arma-el-reto-de-cada-día)).

## Estado de implementación (prototipo frontend)

Existe un **prototipo funcional solo de frontend** en `src/components/dailyChallenge/` (`DailyChallengeLauncher`, `DailyChallengeSheet`, `DailyChallengeCompleteSheet`) + `src/lib/dailyChallenge.ts` y `src/lib/dailyChallengeStreak.ts` (con tests). Sirve para validar que la interacción engancha antes de construir el backend. Lo que es real y lo que está stubbeado / se desvía del diseño de arriba:

| Aspecto | Estado en el prototipo |
|---|---|
| Punto de entrada `.fab` + BottomSheet | ✅ Como el diseño. El FAB usa variante violeta (`.fab--violet`) para diferenciarse del FAB coral de "nuevo análisis" — resuelve la open question de abajo. |
| Ítems del reto | ⚠️ Vienen de posteos recientes de la comunidad (`loadCommunityFeed`), **no** de una cola de casos de mayor desacuerdo. Cuando exista el pipeline de [08-daily-challenge.md](../adaptive-scoring/08-daily-challenge.md), hay que cambiar la fuente. |
| Racha | ⚠️ Se guarda en `localStorage`, no en una tabla `daily_challenge_responses`. La lógica (qué cuenta como seguir la racha) está aislada y testeada en `dailyChallengeStreak.ts`, lista para reusar cuando haya backend. |
| Foto con cara oculta | ⚠️ Se recorta por CSS en el cliente (`.challenge-photo`, `object-position`). Esto **no** cumple el requisito de seguridad del diseño (la foto completa igual se descarga). El recorte real tiene que generarse en el server al armar el reto. |
| El reveal | ⚠️ **Se desvía del diseño**: el prototipo muestra el score de la IA (anillo que cuenta hasta el valor) + "el X% coincidió con vos". El diseño de arriba dice **no** mostrar el score de la IA en el reveal (anclaje para votos futuros). Decisión pendiente: o se ajusta el prototipo, o se actualiza el diseño si se decidió que mostrarlo *después* de votar es aceptable. |

Nada de esto consume el límite de análisis ni toca la base — es puramente cliente sobre datos que ya existen.

## Open questions

- ¿El `.fab` del reto compite visualmente con el `.fab` que ya pueda existir para "nuevo análisis"? Si ya hay un FAB de captura en `home`, hace falta decidir cuál tiene prioridad o si conviven en posiciones distintas — requiere revisar el código actual de `home` antes de implementar, no asumido en este documento.
- ¿El recorte de la foto se guarda como un archivo aparte (`photo_path_cropped` o similar) o se genera al vuelo cada vez que se arma el reto? Guardarlo aparte es más simple de servir pero duplica almacenamiento — decisión técnica para la spec.
