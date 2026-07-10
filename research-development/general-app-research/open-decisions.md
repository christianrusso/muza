# Open decisions

Cosas que están modeladas en el código pero definidas a medias, con placeholders, o pendientes de una decisión de producto.

## Pricing / monetización

- `PLAN_LIMITS.free` y `.pro` tienen `monthlyAnalyses: null` y `historyWindowDays: null` (sin límite) para ambos — "lanzamiento gratis" desde 2026-07, comentario explícito en `src/lib/plans/limits.ts` de revertir cuando se active el pago.
- Constantes ya definidas pero sin uso real: `FREE_MONTHLY_ANALYSES_LIMIT = 5`, `FREE_HISTORY_WINDOW_DAYS = 30`.
- `PRO_MONTHLY_PRICE_USD_PLACEHOLDER = 0` — no hay precio real definido todavía, ni integración de pagos visible en el código relevado.
- **Pendiente de decisión**: cuándo y a qué valor activar estos límites, y qué proveedor de pagos se va a usar (no hay Stripe/MercadoPago ni similar en `package.json`).

## Feature "Simulación IA"

- `canSimulate: boolean` y `simulationsLifetime` existen en `PlanLimits` (`src/lib/plans/limits.ts`), con `canSimulate: false` en free / `true` en pro.
- No se encontró implementación funcional de la feature en sí (qué "simula" — ¿variaciones del outfit? ¿combinaciones sugeridas?) — solo el flag de acceso. Está fuera de alcance actual pero reservado en el modelo de datos.

## Variantes de ocasión: criterio de qué agregar

`src/lib/occasions.ts` documenta explícitamente la regla: agregar una variante solo si cambia el **código de vestimenta** (formalidad, clima, entorno), no si cambia solo la logística. Ejemplo dado en el propio código: el medio de transporte de un viaje no cambia qué ponerse, el destino sí. Vale como criterio a aplicar si se agregan más ocasiones o variantes a futuro.

## Panel admin: single-admin, sin roles

El sistema de auth de `/admin` usa un único par `ADMIN_EMAIL`/`ADMIN_PASSWORD` por variables de entorno — no hay tabla de administradores ni roles/permisos diferenciados. Si se necesita más de un admin o niveles de acceso, hoy no hay dónde modelarlo sin rediseñar ese sistema.

## README y onboarding

El `README.md` de la raíz sigue siendo el boilerplate de `create-next-app` — no documenta el proyecto real. No hay `.env.example`; las variables de entorno necesarias (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, credenciales OpenAI, PostHog, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, etc.) solo se descubren leyendo código. Ver [risks.md](./risks.md) para el impacto de esto.
