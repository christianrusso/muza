# Riesgos y cuestiones a tener en cuenta

## Testing casi inexistente

Un solo archivo de test (`tests/scoring.test.ts`, runner nativo de Node + `tsx`), cubre solo la lógica pura de scoring/gating. No hay tests de componentes, de API routes (`src/app/api/`) ni E2E del flujo de captura→validación→scoring→resultado. Cualquier cambio en `src/lib/scoring/categories.ts`, en el prompt de IA, o en las RLS policies no tiene red de contención automatizada más allá de ese archivo.

## Sin CI/CD

No existe `.github/workflows` ni pipeline equivalente. Nada corre lint/test/build automáticamente en push o PR — el único chequeo es lo que cada dev corra localmente antes de commitear.

## RLS: patrón ya probado frágil (visto en el historial)

Dos migraciones (`0005`, `0007`) tuvieron que corregir bugs de seguridad/visibilidad introducidos por combinar RLS con vistas o subqueries en policies (ver detalle en [05-database.md](./05-database.md#historial-de-bugs-de-seguridadrls)). Riesgo concreto: **cualquier policy o vista nueva que necesite mostrar datos de otro usuario está en riesgo de repetir el mismo bug** si no se usa explícitamente `security definer` / `security_invoker=false` con intención. Antes de tocar RLS, revisar ese historial.

## Funciones `security definer` — superficie sensible

`handle_new_user`, `increment_analysis_usage`, `is_community_photo`, `admin_metrics` corren con privilegios elevados (bypasean RLS del caller a propósito). Son pocas y acotadas hoy, pero cualquier cambio en ellas debe revisarse con más cuidado que código regular — un bug ahí no queda contenido por RLS.

## Variables de entorno no documentadas

No hay `.env.example`. Onboarding de un nuevo dev (o de un futuro yo) requiere leer código para saber qué variables hacen falta: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, credenciales OpenAI, `NEXT_PUBLIC_POSTHOG_KEY`/`HOST`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`. Riesgo de configuración incompleta en un ambiente nuevo (y en producción, ver el guard de `isDemoMode()` en [02-architecture.md](./02-architecture.md)).

## Assets pesados en el repo de código

`public/social/` pesa ~9.9 MB en 45 JPGs sin optimizar (posts + stories de Instagram), no referenciados por el código de runtime — infla el repo y el checkout sin aportar al build funcional. Candidato a mover a un bucket/CDN de marketing separado o al menos comprimir.

## Admin: single point of failure de credenciales

Un solo par `ADMIN_EMAIL`/`ADMIN_PASSWORD` en variables de entorno, sin rotación ni MFA. Si se filtran esas dos variables, hay acceso total al dashboard de métricas de negocio. Ver también [08-open-decisions.md](./08-open-decisions.md#panel-admin-single-admin-sin-roles).

## Dependencia de comportamiento de Next.js custom

Este proyecto corre sobre una versión de Next.js con convenciones distintas a las estándar (`AGENTS.md` lo advierte explícitamente; confirmado: `src/proxy.ts` en vez de `middleware.ts`). Riesgo de escribir código basado en documentación/entrenamiento genérico de Next.js que no aplique a esta versión — conviene verificar contra el comportamiento real antes de asumir una API.
