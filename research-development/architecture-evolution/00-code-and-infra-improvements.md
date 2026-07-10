# Mejoras de código e infraestructura

## Dos categorías distintas: lo simple hoy, y lo que no se puede simplificar después

Antes de la lista, una distinción que conviene tener clara para no aplicar "hagamos MVP" de forma pareja a todo:

- **Cosas que se pueden dejar simples ahora y arreglar después sin dolor** (ej. no tener un dashboard de embudo de activación, no tener leaderboard en el reto diario) — no hacen falta hoy, y agregarlas más adelante no rompe nada de lo que ya existe.
- **Cosas que son baratas de hacer bien ahora y caras de arreglar después** (ej. cómo se estructuran las tablas de feedback nuevas, dónde corren los procesos por lotes, cómo se calcula el costo por usuario) — estas sí merecen algo de cuidado desde el principio, porque cambiarlas después implica migrar datos reales o reescribir con usuarios ya usando el sistema.

La lista de abajo está ordenada así: primero lo barato y de alto impacto, después las decisiones de arquitectura que trae la iniciativa de [adaptive-scoring/](../adaptive-scoring/) y que entran en la segunda categoría.

## Mejoras baratas, alto impacto (no dependen de adaptive-scoring)

Estas ya están anotadas como riesgos en [09-risks.md](../general-app-research/09-risks.md) — acá se les da una propuesta concreta, no solo se repite el riesgo:

| Riesgo ya documentado | Propuesta concreta |
|---|---|
| Sin CI/CD | Un workflow de GitHub Actions que corra `lint` + `tests/scoring.test.ts` + `build` en cada PR. Es horas, no días, y evita que algo roto llegue a `main` sin que nadie lo note — hoy depende 100% de que cada dev corra todo local antes de comitear. |
| Testing casi inexistente | No hace falta cobertura total para un MVP, pero cualquier tabla o función nueva que traiga adaptive-scoring (feedback, clustering, reto diario) debería nacer con al menos un test de la lógica pura, siguiendo el mismo patrón que ya usa `tests/scoring.test.ts` — más fácil de mantener esa disciplina desde el día uno que agregarla después sobre código ya escrito. |
| Sin `.env.example` | Bajísimo esfuerzo, alto impacto en onboarding de cualquier persona nueva (incluida vos mismo en 6 meses). Un archivo con las variables ya listadas en `09-risks.md`, sin valores reales. |
| Assets pesados en el repo (`public/social/`, ~9.9 MB) | Mover a un bucket o CDN de marketing aparte, o al menos comprimir — no aporta nada al build funcional y agranda cada `git clone`. |
| Admin: un solo par de credenciales, sin roles | Mientras el equipo sea 1-2 personas no es urgente. No hay un panel de revisión humana que lo empuje (descartado, ver [04-is-ml-the-right-answer.md](../adaptive-scoring/04-is-ml-the-right-answer.md)) — sigue anotado como decisión pendiente en [08-open-decisions.md](../general-app-research/08-open-decisions.md#panel-admin-single-admin-sin-roles), pero sin una razón concreta nueva que lo urgencie por ahora. |
| Sin monitoreo de errores en producción | No hay mención de Sentry ni similar. Con más superficie de código (feedback, procesos por lotes, reto diario), un error silencioso en un job que corre solo (no en un request que un usuario ve fallar) puede pasar desapercibido por días. Vale la pena sumar algo básico antes de que haya jobs automáticos corriendo sin supervisión. |

## Decisiones de arquitectura que trae adaptive-scoring (acá sí conviene pensar antes de escribir código)

### Dónde corren los procesos por lotes (clustering, armado del reto diario)

Hoy todo el backend es Next.js en Vercel (funciones serverless, con límite de tiempo de ejecución). Los procesos por lotes de [07-implementation-plan.md](../adaptive-scoring/07-implementation-plan.md) (agrupar outfits, armar el reto diario) y de [08-daily-challenge.md](../adaptive-scoring/08-daily-challenge.md) son justo el tipo de trabajo que no calza bien en una función serverless pensada para responder a un usuario en segundos.

**Alternativas reales**:
1. **Vercel Cron + una API route dedicada** — más simple, cero infraestructura nueva, pero sigue atado al límite de tiempo de ejecución de Vercel. Alcanza mientras el volumen de análisis por día sea chico.
2. **Supabase Edge Functions con `pg_cron`** — corre más cerca de los datos (menos latencia de red hacia la base), pero es una plataforma más para operar y depurar.
3. **Un servicio de colas/jobs gestionado** (ej. Inngest, Trigger.dev) — pensado justo para este tipo de trabajo (reintentos, límites de tiempo más generosos, visibilidad de qué corrió y qué falló). Más cara de operar (una pieza más del stack), pero evita reescribir todo si el volumen crece fuerte.

**Recomendación firme: opción 1 (Vercel Cron + una API route protegida por token)**. Razón principal: con el volumen de hoy (bajo, no medido con precisión — ver [00-current-state.md](../adaptive-scoring/00-current-state.md#escala-actual)), agrupar outfits por tags y armar el reto diario son cálculos chicos (segundos, no minutos) que entran cómodos en el límite de tiempo de cualquier plan de Vercel. Las opciones 2 y 3 resuelven problemas que todavía no existen (latencia hacia la base, reintentos automáticos, orquestación de dependencias entre jobs) a cambio de sumar una plataforma nueva que el equipo de 2 personas nunca operó — costo real hoy, beneficio hipotético.

Una condición para que esta elección no salga cara después: escribir la lógica de negocio de estos procesos como funciones puras, separadas de la capa de HTTP, siguiendo el mismo patrón que ya usa `src/lib/scoring/categories.ts` (ver [02-architecture.md](../general-app-research/02-architecture.md)). Así, migrar a la opción 2 o 3 el día que haga falta es mover la función a otro lugar de ejecución, no reescribir la lógica.

**Señales concretas para migrar** (no "cuando crezcamos", algo medible):
- El job de clustering tarda, en 3 corridas seguidas, más de la mitad del límite de tiempo del plan de Vercel — señal de mover el cómputo pesado fuera de una función serverless.
- Una corrida de cron falla y nadie lo nota hasta que un usuario reporta que el reto diario quedó vacío o desactualizado, más de una vez — señal de que hace falta reintento automático y alertas, es decir, pasar a un servicio de colas gestionado en vez de armar reintentos a mano.
- Aparece un tercer proceso por lotes que depende de que los primeros dos terminen bien (ej. "arma el reto solo si el clustering de ese día terminó sin errores") — ahí la orquestación ya no entra cómoda en cron + una API route, y el modelo de pasos/dependencias de un servicio de colas empieza a pagar su costo.

### Crecimiento de `analyses.ai_raw_response`

Esta columna (`jsonb`, guarda la respuesta cruda de la IA para auditoría/debug, ver [04-data-model.md](../general-app-research/04-data-model.md#análisis-de-outfit)) crece con cada análisis y hoy no tiene ninguna política de retención. No es un problema a la escala actual, pero conviene decidir ahora (antes de que sea una migración dolorosa sobre una tabla grande) si se archiva después de N meses o se mantiene para siempre — la respuesta cruda es justamente el tipo de dato que más vale para calibrar el modelo más adelante (ver [11-training-data-sourcing.md](../adaptive-scoring/11-training-data-sourcing.md)), así que borrarla por costo de almacenamiento podría chocar con el objetivo de adaptive-scoring. Probablemente la respuesta correcta es archivar (mover a almacenamiento más barato) en vez de borrar, no ambas cosas son la misma decisión.

### Costo por análisis y control de abuso

Con el reto diario y el feedback explícito, cada usuario activo va a generar más llamadas al modelo de IA por día que hoy (el análisis en sí, más lo que consuma el reto diario si en algún momento evalúa algo con IA en vivo — hoy el reto diario, tal como está diseñado, no agrega llamadas nuevas al LLM, solo reutiliza análisis ya hechos). Aun así, conviene tener, antes de escalar, un límite de rate por usuario en la creación de análisis nuevos (más allá del gating de plan que ya existe en `src/lib/plans/limits.ts`) para que una cuenta comprometida o un bug de cliente no genere un costo inesperado de golpe.

## Open questions

- ¿Cuál es el costo real hoy por análisis (llamadas a OpenAI)? No relevado — hace falta ese número para decidir con seriedad cuándo un límite de rate o un cambio de modelo se vuelve urgente.
- ¿Vale la pena evaluar Sentry (o similar) ahora, antes de que haya jobs automáticos sin supervisión corriendo? Es barato de sumar y el momento antes de tener jobs por lotes es más fácil que después.
