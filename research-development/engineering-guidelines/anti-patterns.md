# Anti-patterns — qué evitar

Cada punto acá tiene un motivo concreto en este repo, no es una regla genérica. Si no entendés el porqué, seguí el link.

## No relajar una RLS policy para "arreglar" un problema de visibilidad

Ya pasó dos veces en este proyecto (migraciones `0005` y `0007`): un dato no era visible para otro usuario por culpa de cómo interactúan RLS + vistas/subqueries, y la solución correcta no fue abrir la policy — fue usar una función `security definer` acotada al caso puntual. Abrir una policy general "para que funcione" es fácil de hacer y fácil de que se convierta en una fuga de datos entre usuarios. Ver [database.md](../general-app-research/database.md#historial-de-bugs-de-seguridadrls).

## No llamar a Supabase u OpenAI directo desde un client component

Toda esa lógica vive en `src/lib/` con `import "server-only"` a propósito. Un `"use client"` que importe esos módulos rompe el build — es la señal de que hay que mover esa llamada a un server component o a un route handler, no de saltarse el import.

## No dejar que la IA calcule el score final

El prompt de scoring le dice explícitamente al modelo que no calcule el overall score. Si en algún punto se cambia el prompt y el modelo empieza a devolver un "score total" propio, no usarlo — la agregación es responsabilidad de `src/lib/scoring/categories.ts`, versionada y testeada aparte del modelo.

## No asumir convenciones estándar de Next.js sin chequear

Este fork tiene diferencias reales de convención (`AGENTS.md` lo advierte, confirmado: `src/proxy.ts` reemplaza a `middleware.ts`). Si algo "debería funcionar así en Next.js" según memoria/entrenamiento pero no coincide con lo que hace el código acá, confiar en el código.

## No bypasear o "arreglar" el guard de modo demo

`isDemoMode()` lanza un error a propósito si faltan credenciales de Supabase en producción. Si el error molesta en un deploy, el problema es que faltan las variables de entorno — no hay que envolver esa llamada en un try/catch para que la app "arranque igual" en modo demo en prod.

## No hardcodear límites de plan en un componente

`FREE_MONTHLY_ANALYSES_LIMIT`, `PRO_MONTHLY_PRICE_USD_PLACEHOLDER`, etc. viven en `src/lib/plans/limits.ts`, con comentarios explicando por qué están en `null`/placeholder hoy (ver [open-decisions.md](../general-app-research/open-decisions.md)). No copiar un número "5" o similar directo en una pantalla — siempre leer de `PLAN_LIMITS`.

## No agregar credenciales/roles de admin fuera de `src/lib/admin/auth.ts`

El panel admin usa un único par `ADMIN_EMAIL`/`ADMIN_PASSWORD` por variable de entorno y cookie HMAC-firmada. No hardcodear un segundo mecanismo de acceso admin en otra parte del código "para probar algo rápido".

## No recrear estilos de botón/card/badge con utilities sueltas de Tailwind

Ver [design-system/components-and-patterns.md](../design-system/components-and-patterns.md#qué-evitar) — duplica el sistema visual y lo desincroniza apenas alguien cambie un token de color en un solo lugar.

## No commitear assets pesados de marketing dentro del código de la app

`public/social/` (campañas de Instagram) no es consumido por el runtime de la app, pero pesa varios MB en el repo — evitar seguir sumando ahí sin optimizar o sin evaluar si corresponde a un repo/bucket separado. Ver [risks.md](../general-app-research/risks.md).

## No mergear cambios en scoring/gating sin actualizar los tests

`tests/scoring.test.ts` es la única red de contención automatizada sobre esa lógica — un cambio de pesos, de la fórmula del techo de ocasión, o de los límites de plan que no toca ese archivo es un cambio sin verificar.
