# Criterios de aceptación, casos de prueba y guardrails

Convierte el diseño de [01-feedback-signal.md](./01-feedback-signal.md), [02-clustering.md](./02-clustering.md) e [07-implementation-plan.md](./07-implementation-plan.md) en algo que se pueda chequear, no solo describir. Objetivo: que ninguna fase se declare "lista" por sensación, y que el rumbo (que el modelo mejore solo sin perder equidad ni control) no se pierda a mitad de camino.

Sigue la numeración de sub-fases de [00-fase-1-feedback-clustering-fewshot.md](./phases/00-fase-1-feedback-clustering-fewshot.md).

## Guardrails que aplican a toda la iniciativa (no negociables)

Estos cuatro frenos bloquean el paso a producción de **cualquier** sub-fase — no son trabajo de una fase puntual, son condiciones previas:

1. **Legal**: la Política de Privacidad tiene que estar actualizada (ver [12-legal-and-privacy.md](./12-legal-and-privacy.md#el-gap-nada-de-esto-está-contemplado-hoy)) antes de que cualquier dato real de uso entre a un pipeline de calibración en producción.
2. **Escala mínima**: no activar ningún ajuste automático (ni siquiera el few-shot dinámico) hasta saber el volumen real de usuarios, posts y reacciones (ver [00-current-state.md](./00-current-state.md#escala-actual)), y usar ese número para fijar el piso mínimo `N` de [01-feedback-signal.md](./01-feedback-signal.md) — no lanzar con un `N` inventado.
3. **Interruptor de apagado**: cada fase tiene que poder desactivarse desde configuración, sin necesidad de desplegar código nuevo, volviendo al comportamiento 100% manual de hoy. Si una fase no se puede apagar así, no está lista.
4. **Equidad**: antes de activar cualquier ajuste automático, correr la auditoría de sesgo de la sección "Equidad" más abajo. Es un requisito previo, no una revisión posterior.

## 1.1 Señal de feedback explícita

### Criterios de aceptación
- Un usuario puede dar feedback (👍/👎 + motivo opcional) sobre su propio análisis en `analysis/[id]/result`.
- Dar feedback es opcional — no bloquea ni condiciona ver el resultado ni ninguna otra parte del flujo.
- Un usuario solo puede dar un feedback por análisis (restricción de base de datos), igual que ya funciona `post_reactions` (ver [05-database.md](../general-app-research/05-database.md)).
- Un admin puede ver el resumen (cuánta gente está de acuerdo o no) por ocasión y por cluster en `/admin`, sin ver de quién es cada voto en particular, salvo que haga falta investigar un caso puntual.

### Casos de prueba
- Alguien da 👍 → se guarda, la pantalla lo refleja.
- Alguien intenta dar feedback dos veces al mismo análisis → **hay que definir el comportamiento antes de construirlo** (¿se actualiza el voto anterior, o queda bloqueado después del primero?). Hoy es una decisión abierta, no dar por sentada ninguna de las dos.
- Alguien borra su análisis → el feedback asociado se borra también (en cascada), consistente con "borrar tu cuenta borra tus datos" de la política de privacidad vigente.
- Alguien que no es dueño del análisis intenta mandar feedback directo a la API → se rechaza (mismas reglas de acceso que el resto de las tablas de análisis).
- La función que resume el feedback para `/admin` no muestra de quién es cada voto a alguien sin permiso de admin.

## 1.2 Clustering básico de outfits

### Criterios de aceptación
- Todo análisis nuevo válido queda asignado a un cluster dentro de un tiempo razonable (a definir — ej. 24 horas, no hace falta que sea al instante para la v1).
- Un análisis con una combinación de tags nunca vista antes crea un cluster nuevo en vez de forzarse dentro de uno que no se parece tanto.
- Ningún cluster influye en el scoring (ver 1.3) hasta cruzar el piso mínimo de muestras del punto "Escala mínima" de arriba.

### Casos de prueba
- Dos análisis con tags de estilo/color muy parecidos → terminan en el mismo cluster.
- Dos análisis claramente distintos (ej. traje formal vs. ropa de gimnasio) → clusters distintos.
- Un cluster con pocas respuestas de feedback → el sistema usa el banco manual de siempre, no un ajuste automático. **Este es el caso de prueba más importante del pedido "que 1 o 2 usuarios no distorsionen el score de todos" — tiene que estar cubierto por un test automático, no solo revisado a mano.**
- **Caso adversarial**: alguien sube 50 análisis casi iguales y les pone 👎 a todos → el resumen del cluster no se puede mover en proporción a la cantidad de *acciones*, sino contar cuántas personas distintas opinaron (chequear que la función que suma los votos ya lo tenga en cuenta desde el diseño — si no, hay que cerrar ese hueco antes de escribir la spec, no dejarlo para después).
- Un cluster con feedback mixto (mitad a favor, mitad en contra) → el ajuste se mantiene cerca de cero, no salta mucho con cada voto nuevo.

## 1.3 Selección dinámica de few-shot

### Criterios de aceptación
- Para clusters con suficientes datos, el prompt de scoring recibe ejemplos armados con el feedback real, en vez de (o además de) los cargados a mano.
- Para clusters sin suficientes datos, el comportamiento es **idéntico** al de hoy — cero cambio para la mayoría de los casos mientras no haya escala.
- El cambio se puede apagar por configuración sin desplegar código (interruptor general).

### Casos de prueba (comparando contra lo que ya existe)
- Correr `scripts/eval/run.ts` con el pipeline nuevo sobre el mismo set de `labels.json` y comparar contra el resultado de hoy. **Hay que acordar un número concreto antes de construir esto** (ej. no empeorar más de 2-3 puntos porcentuales la coincidencia con `labels.json`) — sin ese número fijado de antemano, no hay forma objetiva de decir si la fase "funcionó".
- El mismo outfit, evaluado en días distintos, con el cluster ya juntando feedback → el score no debería cambiar más de un margen chico (a definir) si el resumen real del cluster no cambió — es el mismo principio de consistencia que ya sigue el `temperature: 0` de hoy (ver [06-scoring-engine.md](../general-app-research/06-scoring-engine.md)).
- Ampliar `tests/scoring.test.ts` (el único test que existe sobre esta lógica hoy, ver [09-risks.md](../general-app-research/09-risks.md)) para cubrir también la nueva función que elige los ejemplos, no solo `computeOverallScore`.

## 1.4 Instrumentación

### Criterios de aceptación
- `admin_metrics()` muestra, como mínimo: cuánta gente responde al feedback, cuánta gente está de acuerdo o no (en total y por cluster), qué porcentaje de `scoring_examples` se cargó a mano vs. automático, y qué tan grande es cada cluster.

### Casos de prueba
- Con datos de prueba, el panel muestra los números correctos (probar que la cuenta está bien hecha, no solo que la pantalla carga).

## Equidad: la auditoría que hay que pasar antes de producción

Antes de activar cualquier ajuste automático (desde 1.3 en adelante):

- Tomar una muestra de clusters con ajuste activo y comprobar que el ajuste **no está relacionado** con cosas que un modelo de visión podría deducir de la foto aunque nunca se pidan (tono de piel, tipo de cuerpo, género aparente) — comparando el score promedio del cluster contra una muestra variada de fotos de prueba.
- Si aparece esa relación, se apaga la fase (interruptor de apagado) hasta entender por qué — no se "arregla suave" en producción.
- Repetir esta revisión cada vez que un cluster crezca mucho, no solo una vez al lanzar.

### Además: auditar el feedback humano, no solo al modelo

Si más adelante se suma feedback de terceros — gente evaluando fotos de otras personas, no solo la propia (ver el riesgo del efecto halo en [01-feedback-signal.md](./01-feedback-signal.md#el-efecto-halo-te-puede-gustar-la-persona-no-el-outfit) y en [03-personalization-and-onboarding.md](./03-personalization-and-onboarding.md#el-riesgo-nuevo-que-trae-esta-feature-el-efecto-halo)) — hay que auditar también **al feedback en sí**, no solo al modelo:

- Comprobar si las opiniones de un mismo cluster/ocasión se parecen menos cuando la foto tiene distintas personas, que cuando el outfit es literalmente el mismo con distinta gente puesta encima (por ejemplo, usando fotos de prueba con la misma ropa en maniquíes o en personas distintas). Si el "veredicto" cambia mucho solo por cambiar de persona, es evidencia de efecto halo contaminando el feedback.
- Si se detecta, la mitigación no es técnica sobre el modelo — es rediseñar cómo se pide ese feedback (por ejemplo, recortar o difuminar la cara antes de mostrarlo para calificar), como ya propone [01-feedback-signal.md](./01-feedback-signal.md#recomendación-separar-señal-social-de-señal-de-calibración-y-empezar-solo-con-auto-reporte).
- Esta auditoría solo aplica si y cuando se construya feedback de terceros. Mientras el feedback sea de auto-reporte (v1), el riesgo es mucho menor y no bloquea el lanzamiento — sí hay que dejarlo anotado para no olvidarlo cuando la feature de terceros se construya.

## Números a mirar en el tiempo (no son criterios de una fase puntual, son la brújula de todo el esfuerzo)

- **Cuánta gente no está de acuerdo con su score** — la métrica de éxito principal. Debería bajar con el tiempo si el sistema realmente mejora.
- **Qué tan bien coincide con `labels.json`** (los datos etiquetados a mano) — no debería empeorar a medida que el sistema se vuelve más automático.
- **Cuántos `scoring_examples` se cargan a mano por mes** — debería bajar a medida que el feedback real reemplaza la curación manual (es, literalmente, la medida de si se resolvió el problema original).
- **Qué tan parejo es el tamaño de los clusters** — para saber si el piso mínimo `N` elegido es realista, o si casi ningún cluster lo cruza nunca (en ese caso, hay que revisar el diseño del clustering, no solo esperar más volumen).
- **Cuánta gente responde al feedback signal** — si es muy bajo, el mecanismo elegido en [01-feedback-signal.md](./01-feedback-signal.md) no está funcionando y hay que volver a mirar las alternativas de [05-alternatives-and-tradeoffs.md](./05-alternatives-and-tradeoffs.md#1-señal-de-calibración-feedback-explícito-vs-alternativas).

## Open questions

- ¿Quién define los números concretos (umbral de regresión aceptable, `N` mínimo por cluster, tiempo máximo del batch de clustering)? Son decisiones de producto que necesitan datos que hoy no están (ver [00-current-state.md](./00-current-state.md#escala-actual)) — quedan como espacios a llenar antes de la spec de implementación, no antes de este research.
- ¿La auditoría de equidad se hace a mano (revisar una muestra) o se automatiza desde el principio? Con el volumen inicial, probablemente alcance con hacerla a mano — automatizarla ahora sería prematuro sin saber todavía qué patrones buscar primero.
