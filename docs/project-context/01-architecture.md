# Arquitectura técnica

## Stack

- Next.js `16.2.9` con App Router.
- React `19.2.4` y TypeScript.
- Tailwind CSS 4 mediante PostCSS.
- Supabase para Auth, Postgres, RLS y Storage.
- OpenAI para visión, validación y scoring.
- Vercel como destino de despliegue (`vercel.json`).
- `zod` para validación de payloads en route handlers.
- `sharp` para share cards.
- `date-fns`, `clsx` y `tailwind-merge` para utilidades.

El proyecto tiene una regla especial en `AGENTS.md`: antes de escribir código Next.js se deben consultar las guías locales de `node_modules/next/dist/docs/`, porque esta versión puede tener APIs y convenciones distintas a las conocidas por el agente.

## Estructura principal

```text
src/
  app/                 Rutas, layouts, páginas y route handlers
  components/          Componentes visuales reutilizables
  lib/                 Integraciones, casos de uso y acceso a datos
  types/               Tipos de dominio y tipos Supabase
  proxy.ts             Protección de rutas y refresh de sesión
supabase/
  migrations/          Esquema y evolución de Postgres/RLS
  templates/           Emails de Auth
  seed_test_users.sql  Datos de prueba
scripts/               Seeds, evaluaciones de IA y operaciones
tests/                 Tests Node/TypeScript
docs/                  Documentación de producto y contexto
specs/                 Specs SDD por feature
public/, assets/       Imágenes, videos, logos y fuentes
design/                Material de diseño y marca
```

## Enrutamiento Next.js

### Superficie pública

- `src/app/page.tsx`: landing/entrada principal.
- `src/app/(auth)/`: bienvenida, registro, login, recuperación y reset de contraseña.
- `src/app/legal/`: contenido legal público.
- `src/app/auth/callback/route.ts`: intercambio OAuth y actualización de perfil.

### Superficie autenticada

El grupo `src/app/(app)/` contiene la aplicación tipo teléfono. `(tabs)` contiene las pestañas principales: home, history, community y profile.

Rutas relevantes:

- `/home`
- `/history`
- `/community`
- `/community/post/[id]`
- `/community/publish`
- `/community/activity`
- `/community/user/[id]`
- `/profile`
- `/profile/settings`
- `/analysis/new`
- `/analysis/[id]/validating`
- `/analysis/[id]/result`
- `/analysis/[id]/partial`
- `/analysis/[id]/invalid`

Los paréntesis de los route groups no aparecen en la URL.

### Panel admin

El admin está separado de la sesión Supabase del usuario:

- `/admin/login`
- `/admin`
- `/admin/analytics/blocks`
- `/admin/users`
- `/admin/users/[id]`
- APIs bajo `/admin/api/...`

La cookie firmada `ll_admin` se verifica en `src/proxy.ts`, en el layout admin y en los route handlers. La identidad admin actual se configura por variables de entorno; no es un usuario normal de la tabla `profiles`.

### APIs de aplicación

Las APIs de usuarios viven bajo `/api/`:

- `/api/analyses`
- `/api/analyses/[id]/validate`
- `/api/analyses/[id]/score`
- `/api/analyses/[id]/share-card`
- `/api/community/posts`
- `/api/community/posts/[id]`
- `/api/community/posts/[id]/like`
- `/api/community/posts/[id]/vote`
- `/api/community/posts/[id]/comments`
- `/api/community/comments/[commentId]/report`
- `/api/community/comment-report-categories`
- `/api/community/users/[id]/follow`
- `/api/community/users/[id]/block`
- `/api/community/blocked-users`
- `/api/community/activity/seen`
- `/api/account/delete`
- `/api/analytics/complete-registration`

Los handlers de Next 16 reciben `params` como `Promise` y deben hacer `await params`.

La moderación de comentarios agrega `/admin/comment-reports` y APIs bajo
`/admin/api/comment-reports`, protegidas por la cookie admin y service-role.

## Ciclo de una request

1. El request entra por `src/proxy.ts`.
2. Si empieza con `/admin`, se valida la cookie admin y no se ejecuta el flujo normal de refresh Supabase.
3. Las demás rutas pasan por `updateSession` de `src/lib/supabase/middleware.ts`.
4. Un Server Component o route handler usa `createClient()` para operar como usuario autenticado y respetar RLS.
5. Una operación privilegiada usa `createAdminClient()` o `serviceDb()` exclusivamente en servidor.
6. La respuesta se renderiza en Server Components o se consume desde Client Components.

No importar módulos service-role en componentes cliente. No exponer `SUPABASE_SERVICE_ROLE_KEY` ni credenciales de OpenAI al navegador.

## Clientes Supabase

- `src/lib/supabase/client.ts`: browser client con anon key.
- `src/lib/supabase/server.ts`: server client con cookies y anon key; respeta RLS.
- `src/lib/supabase/admin.ts`: service-role client tipado; bypass de RLS, sólo servidor.
- `src/lib/serviceDb.ts`: service-role client sin tipos generados para infraestructura y RPCs no modeladas.
- `src/lib/supabase/photos.ts`: URLs firmadas de Storage.

## Modo demo

`src/lib/demo.ts` activa demo cuando faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`, salvo que falten en producción, donde lanza un error de configuración.

En demo:

- `src/lib/demoStore.ts` mantiene datos en memoria sobre `globalThis` durante el proceso Node.
- `src/lib/demoClient.ts` permite operaciones client-side compatibles.
- `src/lib/demo.ts` provee resultados stub para validación y scoring.
- Los route handlers deben ofrecer una rama demo cuando la funcionalidad existente ya la ofrece.

El demo se reinicia al reiniciar el proceso y no es una persistencia de producción.

## UI y diseño

- Mobile-first, columna máxima de aproximadamente 430px en desktop.
- `src/app/(app)/layout.tsx` encuadra la app tipo teléfono sobre fondo oscuro.
- Colores principales: coral `#ec5a2e`, tinta `#141210`, papel `#f7f5f0`.
- Tipografías: Manrope para sans y Instrument Serif para títulos/branding.
- Componentes compartidos en `src/components/ui/`.
- Iconos mediante Material Symbols y `MaterialIcon`.
- Mantener español argentino en copy nuevo.

## Validación y manejo de errores

- Validar JSON con Zod antes de acceder a datos.
- Usar códigos de error estructurados en APIs de aplicación.
- La UI debe mostrar errores recuperables y evitar dejar spinners bloqueados.
- Analytics y pixels deben fallar silenciosamente; un fallo de tracking nunca rompe el producto.
