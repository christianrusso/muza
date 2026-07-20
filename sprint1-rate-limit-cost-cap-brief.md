# Brief técnico — Rate limiting + tope de gasto de IA con alertas (Sprint 1)

**Objetivo (roadmap, sección 2.2, "crítico con lanzamiento gratis"):** hoy no hay ninguna barrera
técnica que frene un abuso o un bug que dispare llamadas ilimitadas a OpenAI. Esta tarea agrega
dos protecciones independientes: un límite de velocidad (cuántos análisis por minuto/hora puede
crear un mismo usuario/IP) y un techo de gasto diario/mensual con alerta.

## Estado actual del repo (confirmado en código)

- `src/lib/plans/limits.ts`: **a propósito**, `monthlyAnalyses: null` para Free y Pro durante el
  lanzamiento gratis (sin tope de producto). Eso está bien y no se toca — esta tarea es una
  protección técnica aparte, no un límite de plan.
- `src/app/api/analyses/route.ts` (creación de análisis): no tiene ningún rate limit — cualquiera
  autenticado puede crear análisis en loop, y cada uno dispara `/validate` + `/score`, dos
  llamadas pagas a OpenAI (`gpt-4o`, visión con `detail: "high"`, la más cara).
- No hay **ninguna** librería de rate limiting en el repo (no `@upstash/ratelimit`, no Redis).
- No hay **ninguna** tabla ni mecanismo que registre cuánto se gastó en OpenAI — no hay
  `ai_usage_log` ni nada parecido en el esquema.
- No hay **ningún canal de alertas** configurado: no hay Sentry (`@sentry/nextjs` no está
  instalado — es justo otro ítem pendiente del Sprint 1), ni servicio de email transaccional
  (Resend, SendGrid), ni webhook de Slack/Discord. Hay que elegir uno.
- El SDK de OpenAI (`openai@6.45.0`) devuelve `response.usage` (tokens de entrada/salida) en cada
  llamada — confirmé el tipo `ResponseUsage` en
  `node_modules/openai/resources/responses/responses.d.ts`. Con eso se puede calcular el costo
  real de cada llamada usando el precio por token del modelo (`gpt-4o` — definir la tarifa vigente
  en un config, no hardcodeada en el medio del código).
- Las dos llamadas a OpenAI están en `src/lib/ai/scoreOutfit.ts` (`scoreOutfit`) y
  `src/lib/ai/validateImage.ts` (`validateOutfitImage`) — ambas comparten `getOpenAIClient()` de
  `src/lib/ai/client.ts`.

## Decisiones a tomar antes de implementar

1. **Dónde guardar los contadores de rate limit.** Dos caminos razonables:
   - **Upstash Redis + `@upstash/ratelimit`** (recomendado): tiene tier gratis, está pensado
     exactamente para esto (sliding window en serverless/Vercel), y es la librería estándar del
     ecosistema Next+Vercel. Requiere crear una cuenta y dos env vars
     (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
   - **Tabla en Supabase (Postgres) que ya usás**: sin agregar ningún servicio nuevo, pero hay que
     escribir la lógica de ventana deslizante a mano (más código, un poco más lento por ser una
     query a Postgres en cada request en vez de Redis).
   Si no querés sumar una cuenta nueva todavía, arrancar con la opción Postgres es válido; migrar
   a Upstash después si el volumen lo pide.
2. **Canal de alertas.** Sin infra de notificaciones hoy, lo más simple es email transaccional
   con **Resend** (tier gratis, se integra en minutos a un route de Next) al mail del founder. Si
   ya usás Slack para el día a día, un webhook de Slack es igual de simple y más inmediato en el
   celular.
3. **Números de los topes.** Definir un valor inicial conservador para arrancar (ej. tope diario
   USD 15–20, tope mensual USD 300 — ajustar contra el presupuesto real de ads/infra del roadmap)
   como env vars, no hardcodeado.

## Plan técnico

### 1. Rate limiting en la creación de análisis

En `src/app/api/analyses/route.ts`, antes de todo lo demás (incluso antes de leer el body),
chequear el límite por usuario y por IP:

```ts
import { rateLimitAnalysisCreation } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // ... obtener user.id primero si ya está autenticado en este punto, si no, limitar solo por IP
  // y aplicar el límite por usuario después de resolver `user`.

  const limited = await rateLimitAnalysisCreation({ userId: user?.id, ip });
  if (limited) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Estás creando análisis muy rápido. Esperá un momento." } },
      { status: 429 },
    );
  }
  // ...resto del handler sin cambios
}
```

`src/lib/rateLimit.ts` (nuevo), con Upstash:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Dos ventanas: corta (ráfagas) y larga (abuso sostenido).
const perMinute = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m") });
const perHour = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 h") });

export async function rateLimitAnalysisCreation({ userId, ip }: { userId?: string; ip: string }) {
  const key = userId ?? `ip:${ip}`; // preferir user id; IP como red de contención para no-auth
  const [minute, hour] = await Promise.all([perMinute.limit(key), perHour.limit(key)]);
  return !minute.success || !hour.success;
}
```

(Los números — 5/minuto, 30/hora — son un punto de partida; ajustar con el uso real observado en
Sprint 1-2.)

### 2. Registrar el gasto de cada llamada a OpenAI

Nueva tabla Supabase `ai_usage_log`:

```sql
create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  endpoint text not null, -- 'validate' | 'score'
  input_tokens int not null,
  output_tokens int not null,
  estimated_cost_usd numeric(10,4) not null,
  created_at timestamptz not null default now()
);
```

En `scoreOutfit.ts` y `validateImage.ts`, después de la llamada, loguear el uso:

```ts
const response = await getOpenAIClient().responses.parse({ /* ... */ });
await logAiUsage({ endpoint: "score", usage: response.usage, userId });
```

`logAiUsage` calcula el costo con el precio por token vigente de `gpt-4o` (guardarlo en un config,
ej. `src/lib/ai/pricing.ts`, para actualizarlo el día que cambie la tarifa de OpenAI) e inserta la
fila. Esto no bloquea nada todavía — es solo el registro.

### 3. El corte (circuit breaker) antes de llamar a la IA

Antes de cada llamada a `scoreOutfit`/`validateOutfitImage`, sumar el gasto del día y del mes desde
`ai_usage_log` y compararlo contra `AI_DAILY_BUDGET_USD` / `AI_MONTHLY_BUDGET_USD` (env vars). Si
se pasó, no llamar a OpenAI y devolver un error amigable ("El servicio está saturado por hoy,
probá más tarde") en vez de dejar que la factura siga creciendo. Este chequeo puede vivir en un
helper compartido (`src/lib/ai/budgetGuard.ts`) que ambos endpoints (`/validate` y `/score`) llamen
antes de todo.

### 4. La alerta

Cuando el gasto cruza, por ejemplo, el 80% del tope diario/mensual (antes de llegar al 100% y
cortar), disparar un aviso — no esperar a que ya esté cortado para enterarte:

- Con **Resend**: un route interno o el mismo `budgetGuard` llama a la API de Resend para
  mandarte un mail. Requiere `RESEND_API_KEY` y un dominio verificado (o el dominio de prueba de
  Resend para arrancar rápido).
- Alternativa más simple de instalar ya: un **webhook de Slack/Discord** (una sola URL, sin
  librería), quizás más rápido de tener andando esta semana.

## Checklist de aceptación

- [ ] Crear 6+ análisis en menos de un minuto desde la misma cuenta devuelve `429` en vez de
      seguir llamando a la IA.
- [ ] El límite también aplica por IP (probar con dos cuentas nuevas desde la misma conexión).
- [ ] Cada llamada a `/validate` y `/score` deja un registro en `ai_usage_log` con el costo
      estimado.
- [ ] Si se fuerza el gasto del día por encima del tope (bajarlo temporalmente a un valor chico
      para probar), la próxima llamada a la IA se corta con un mensaje amigable, no con un 500 o
      502 crudo.
- [ ] Llega la alerta (mail o Slack) cuando se cruza el 80% del tope, antes del corte real.
- [ ] Los números de los topes y de las ventanas de rate limit están en env vars, no hardcodeados
      en el medio del código.
- [ ] Nada de esto rompe el flujo normal de un usuario real usando la app de forma normal (los
      límites tienen que ser generosos para uso legítimo, ajustados solo contra abuso).
