# Arquitectura

## Capas de alto nivel

```
src/proxy.ts              → entry point de middleware: enruta /admin vs resto de la app
src/lib/supabase/         → clientes Supabase (server/client/admin/middleware), signed URLs
src/lib/admin/            → auth propia del panel admin (independiente de Supabase Auth)
src/lib/ai/               → cliente OpenAI, prompts (.prompt.ts separados), schemas Zod
src/lib/scoring/          → lógica de negocio pura del cálculo de puntaje (sin IA, sin DB)
src/lib/plans/            → límites y gating de planes free/pro
src/lib/community/        → feed, constantes de paginación/orden
src/lib/demo.ts + demoClient.ts + demoStore.ts → modo demo sin backend
src/app/(auth)/...        → páginas de login/registro
src/app/(app)/(tabs)/...  → home, history, community, profile (bottom tab bar)
src/app/(app)/analysis/...→ flujo de captura y resultado de análisis
src/app/admin/(dashboard)/→ panel admin, layout propio
src/app/api/...           → route handlers (analyses, community/posts, account/delete)
```

Route groups de Next usados para separar layouts sin afectar la URL: `(app)`, `(tabs)`, `(auth)`, `(dashboard)`.

## Server vs Client Components

Server Components por defecto; `"use client"` solo donde hace falta interactividad real (cámara, formularios, feed infinito con scroll). Los módulos de `src/lib/ai/` y `src/lib/community/feed.ts` (entre otros de la capa de datos) importan `"server-only"` deliberadamente para que un import accidental desde un client component rompa el build en vez de filtrar código/credenciales al bundle del navegador.

## El proxy como router de dos mundos

`src/proxy.ts` resuelve primero si el path es `/admin/*`: si lo es, corta ahí mismo (chequea la cookie `ll_admin`, redirige a `/admin/login` si hace falta) **sin tocar Supabase**. Si no es `/admin`, delega en `updateSession()` (`src/lib/supabase/middleware.ts`), que maneja sesión de usuario normal. Esto evita que la lógica de redirect de usuarios (por ejemplo, "sin sesión → `/welcome`") interfiera con el panel admin, que tiene su propio esquema de auth. Detalle completo en [flows.md](./flows.md).

## Modo demo como capa de fallback completa

Si faltan credenciales de Supabase (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `src/lib/demo.ts` activa un modo donde **toda** la app corre con datos en memoria (`demoStore.ts`) y stubs de IA (`buildStubValidationResult`, `buildStubScoringResult`), sin pegarle a Supabase ni a OpenAI. Permite clonar el repo y probar el flujo completo sin backend. Tiene un guard explícito que impide que esto pase en producción por accidente (lanza `Error` si `NODE_ENV=production` y faltan las credenciales) — ver [risks.md](./risks.md).

## Instrumentación de performance

`src/lib/perf.ts` (función `timed()`) + headers `Server-Timing` seteados desde el middleware de Supabase. Existe porque el edge corre en São Paulo (`gru1`) y Supabase en US East — hay decisiones de código tomadas específicamente para minimizar ese round-trip (ej. usar `getClaims()` en vez de `getUser()`, ver [flows.md](./flows.md#auth-usuarios)).

## Streaming / loading states

Patrón consistente: cada ruta principal (`home`, `history`, `community`, `result`) tiene su propio `loading.tsx` + componente `Skeletons.tsx`, aprovechando Suspense/streaming de Server Components.

## Cómo se conectan las piezas (resumen)

1. `proxy.ts` decide si la request es de admin o de app normal.
2. Server Components en `src/app/` llaman a funciones de `src/lib/*` (nunca a Supabase/OpenAI directo desde el componente).
3. `src/lib/*` decide, vía `isDemoMode()`, si pegarle a Supabase/OpenAI reales o devolver datos mock.
4. La lógica de negocio pura (scoring, gating) vive separada de la capa de datos — `src/lib/scoring/categories.ts` no sabe nada de Supabase ni de IA, solo recibe números y aplica reglas.
5. El resultado de un análisis se persiste en 3 tablas relacionadas (`analyses`, `analysis_categories`, `analysis_feedback`) — ver [data-model.md](./data-model.md).
