# Patrones recurrentes en el código

## `server-only` como guardrail de bundle

Módulos que tocan credenciales o lógica de servidor (`src/lib/ai/`, `src/lib/community/feed.ts`, etc.) importan `"server-only"` al principio del archivo. No es documentación, es un guardrail real: si algo los importa desde un client component, el build falla. Excepción intencional: `src/lib/admin/auth.ts` **no** importa `server-only` ni módulos de Node porque necesita correr también en el edge runtime (el proxy) — usa Web Crypto (`crypto.subtle`) en vez de las libs de Node para eso.

## Fallback a modo demo, no a datos parciales

Cuando faltan credenciales, la app no intenta "andar a medias" con Supabase real y datos vacíos — conmuta completamente a un store en memoria con datos seed coherentes (`demoStore.ts`, `demo.ts`). La decisión se toma en un solo punto (`isDemoMode()`) y de ahí se propaga. Ver [02-architecture.md](./02-architecture.md#modo-demo-como-capa-de-fallback-completa).

## Funciones `security definer` para esquivar RLS a propósito (con cuidado)

Cuando una operación necesita cruzar el límite de "lo que el usuario logueado puede ver por RLS" de forma controlada, se usa una función Postgres `security definer` en vez de relajar la policy:
- `increment_analysis_usage(p_user_id)` — el usuario no puede escribir directo en `plan_usage`, solo vía este RPC.
- `is_community_photo(p_photo_path)` — permite chequear si una foto pertenece a un post de comunidad sin que la subquery corra bajo el RLS restrictivo del caller (esto rompió dos veces antes de llegar a la solución actual, ver [05-database.md](./05-database.md#historial-de-bugs-de-seguridadrls)).
- `admin_metrics()` — agrega datos de negocio cross-usuario, solo ejecutable por `service_role` (revocado explícitamente para `public/anon/authenticated`).

Patrón a replicar si aparece una necesidad similar: función SQL puntual y acotada, no relajar la policy general de la tabla.

## Vistas + RLS es una combinación frágil

`community_feed_view` tuvo que pasar de `security_invoker = true` a `false` (migración `0005`) porque con invoker=true, la vista aplicaba el RLS del usuario que consulta sobre `analyses`, y esa policy es owner-only — el resultado era que nadie podía ver posts ajenos en el feed. Lección aplicada en el resto del código: cualquier vista o función que necesite exponer datos cross-usuario debe decidir explícitamente su modo de seguridad, no asumir el default.

## Scoring: lógica de negocio separada de la IA

`src/lib/scoring/categories.ts` es puro — recibe scores por categoría (ya generados por IA) y aplica reglas determinísticas (pesos, renormalización, techo de ocasión). La IA nunca calcula el overall score, solo puntúa cada categoría individualmente; el prompt se lo dice explícitamente al modelo. Esto permite ajustar la fórmula de agregación sin tocar el prompt, y viceversa. Detalle en [06-scoring-engine.md](./06-scoring-engine.md).

## Few-shot calibration con banco de ejemplos en DB

En vez de embeber ejemplos fijos en el prompt, hay una tabla `scoring_examples` (foto + veredicto `good`/`bad` + nota de experto) que se inyecta dinámicamente como contenido few-shot según la ocasión del análisis. Permite calibrar el modelo sin deployar código nuevo.

## Gating como funciones puras sobre un objeto de límites

`src/lib/plans/gating.ts` no lee límites hardcodeados dispersos — todo pasa por `PLAN_LIMITS[planTier]` (`src/lib/plans/limits.ts`) y las funciones (`canCreateAnalysis`, `historyCutoffDate`) son puras (reciben estado, devuelven boolean/fecha). Facilita testear y facilita reactivar límites reales cambiando solo el objeto de configuración.

## Comparaciones sensibles a timing con `safeEqual`

`src/lib/admin/auth.ts` compara firma HMAC y password contra XOR en tiempo constante (`safeEqual`), no con `===`, para evitar timing attacks en el login de admin.
