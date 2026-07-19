# Best practices

> **En resumen**: los patrones a replicar al escribir código nuevo — server-only por defecto, lógica pura separada de IO, RLS con funciones acotadas en vez de policies abiertas, la IA solo puntúa (nunca agrega el score), y toda feature no trivial arranca con una spec, no con código.

## Arquitectura de código

- **Server Components por defecto.** Marcá `"use client"` solo en componentes que necesitan interactividad real (cámara, forms, feed con scroll). Cuanto menos JS viaja al cliente, mejor performance en una app mobile.
- **Import `"server-only"` en cualquier módulo de `src/lib/` que toque credenciales o lógica de servidor.** Es un guardrail real: si algo lo importa desde un client component, el build falla. Así se detecta el error de scope en compile-time, no en producción.
- **Separá lógica de negocio pura de la capa de IO.** El motor de scoring (`src/lib/scoring/categories.ts`) es el ejemplo a seguir: recibe números, aplica reglas, devuelve un resultado — no sabe nada de Supabase ni de OpenAI. Esto permite testear la fórmula sin mockear nada, y cambiarla sin tocar el prompt de IA.
- **Las funciones de gating son puras.** `canCreateAnalysis`, `historyCutoffDate` (`src/lib/plans/gating.ts`) reciben estado y devuelven un resultado, no leen `process.env` ni pegan a la DB directamente. Si agregás gating nuevo, seguí el mismo patrón.

## Base de datos / Supabase

- **Cuando necesites que una policy o vista muestre datos de otro usuario, resolvelo con una función `security definer` acotada**, no relajando la policy general de la tabla (ver ejemplos: `increment_analysis_usage`, `is_community_photo`, `admin_metrics`). El historial de este repo ya mostró que "una policy más permisiva" rompe cosas de forma no obvia (ver [01-anti-patterns.md](./01-anti-patterns.md)).
- **Toda tabla nueva con datos de usuario lleva RLS habilitado desde la migración que la crea**, no como un paso posterior.
- **Las migraciones son incrementales y nunca se editan retroactivamente** — si algo de una migración vieja está mal, se corrige con una migración nueva (así se hizo con los fixes de RLS en `0005` y `0007`).

## IA / scoring

- **El modelo de IA puntúa, el server agrega.** No le pidas al modelo que calcule el overall score — la fórmula de agregación (pesos, techo de ocasión, renormalización) vive en código server, versionada y testeable.
- **`temperature: 0` en las llamadas de scoring** — el mismo outfit debe dar el mismo puntaje. Si agregás una llamada de IA nueva que necesita determinismo, aplicá el mismo criterio.
- **Calibrá con el banco `scoring_examples`, no hardcodeando ejemplos en el prompt.** Permite ajustar sin deployar código.

## Seguridad

- **Comparaciones de secretos/firmas en tiempo constante** (`safeEqual` en `src/lib/admin/auth.ts`) — si agregás una comparación nueva de token/password/firma, no uses `===` directo.
- **El modo demo nunca debe degradar silenciosamente en producción.** El guard de `isDemoMode()` (lanza error si faltan credenciales de Supabase y `NODE_ENV=production`) es el patrón a replicar para cualquier otro fallback similar que se agregue a futuro.

## Frontend / UI

- **Antes de estilar algo nuevo, revisá si ya existe la clase semántica en `globals.css`** (`.btn-*`, `.card`, `.badge--*`, `.chip`, etc.) — ver [design-system/02-components-and-patterns.md](../design-system/02-components-and-patterns.md). Extender el sistema existente, no crear uno paralelo con utilities sueltas.
- **Diseñá para el canvas mobile fijo (`max-w-[430px]`).** No es un breakpoint entre varios, es el layout objetivo.
- **Cada ruta principal nueva lleva su `loading.tsx` + skeleton.** Es el patrón ya establecido en `home`, `history`, `community`, `result`.

## Proceso

- **Cambios en `src/lib/scoring/` o `src/lib/plans/` requieren agregar/actualizar un test en `tests/scoring.test.ts`** — es la única red de contención automatizada que existe sobre esa lógica hoy (ver [09-risks.md](../general-app-research/09-risks.md)).
- **Features no triviales arrancan con una spec, no con código.** Ver [02-spec-driven-development.md](./02-spec-driven-development.md).
