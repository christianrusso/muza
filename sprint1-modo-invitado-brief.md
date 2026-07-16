# Brief técnico — Modo invitado (browse-first, muro por acción)

**Objetivo:** hoy el registro es un muro en la puerta: un visitante sin sesión no ve absolutamente
nada de la app (el proxy lo manda a `/welcome` o a la landing). Paga el costo de registrarse antes
de tener una sola prueba de que el producto vale la pena. Este brief invierte el orden: el invitado
navega la comunidad y arranca el flujo de análisis libremente, y el registro se pide **en el momento
de actuar** (puntuar, votar, comentar, seguir, publicar), cuando ya vio el valor y tiene intención.

No es solo UX: es lo que hace medible la pregunta que hoy no podemos responder — cuánta gente rebota
en el registro sin haber visto nada.

## Estado actual del repo (confirmado en código)

- **El gate vive en `src/proxy.ts`** (Next 16 renombró `middleware.ts` → `proxy.ts`) y delega en
  `updateSession()` de `src/lib/supabase/middleware.ts`. Todo lo que no esté en `AUTH_ROUTES` ni en
  `PUBLIC_ROUTES` y no tenga sesión → `redirect` a `/welcome?next=<ruta>`.
- **`PUBLIC_ROUTES = ["/legal", "/landing.html", "/community/post"]`** — o sea que el modo invitado
  ya existe, pero para una sola pantalla.
- **El patrón a generalizar ya está escrito.** `src/app/(app)/community/post/[id]/page.tsx` no usa el
  cliente normal para los datos públicos: usa **`createAdminClient()`** (`src/lib/supabase/admin.ts`,
  service role, bypassa RLS) y arma un `PostDetail` que incluye **`isAuthed: boolean`**, que baja a
  `PostVotePanel` / `CommentForm` / `DeletePostButton` para gatear las acciones. Esta tarea es
  extender ese mismo patrón al resto de la app.
- **RLS no deja pasar a un anónimo.** Todas las policies de lectura son `to authenticated`
  (`0003_rls_policies.sql`: `profiles_select_authenticated`, `community_posts_select_authenticated`,
  `post_reactions_select_authenticated`, `post_comments_select_authenticated`; `0017_post_votes.sql`:
  `post_votes_select_authenticated`). **No hay un solo grant a `anon` en ninguna migración.** Un
  cliente con la anon key no lee nada de la DB. Por eso el service role es el único camino, y por eso
  la página pública de post ya lo usa.
- **`/` para anónimos hace `rewrite` a `/landing.html`** (estático en `public/`, destino de las
  campañas de Meta/TikTok). Cualquier cambio acá toca el embudo de adquisición pago: cuidado.
- **Onboarding obligatorio** por `user_metadata.onboarded` dentro del JWT (leído desde los claims,
  zero-DB). Un invitado que se registra cae en `/onboarding` (género) antes de volver a lo suyo — eso
  se interpone entre el muro y el "replay" de la acción. Ver Decisión 5.
- **El modo demo NO sirve para esto.** `src/lib/demo.ts` / `demoClient.ts` se activan solo cuando
  faltan las credenciales de Supabase y **tiran error en producción a propósito**. Es un mock de dev,
  no un invitado. No reusar ni extender.
- **El costo de IA ya tiene protecciones** (`0018_ai_rate_limit_and_usage.sql`, rate limit + circuit
  breaker de presupuesto, del 2026-07-15). Son por usuario/IP y asumen sesión.

## Decisiones de diseño

### 1. Sin anonymous auth de Supabase

Supabase ofrece `signInAnonymously()`, que daría un JWT real y haría funcionar RLS sin cambios.
**No conviene:** por definición el invitado nunca escribe, así que no necesita identidad. A cambio
crearía una fila en `profiles` por cada visitante — basura que ensucia el panel de admin y las
métricas que acabás de construir (`0019`, `0020`, `lib/admin/metrics.ts`), infla `signed_up`, y te
obliga después a distinguir "usuario" de "fantasma" en cada query. El invitado es **ausencia de
sesión**, no un tipo de sesión.

### 2. Lecturas de invitado por service role — no tocar RLS

Dos caminos posibles:

- **(A) Service role server-side** — extender lo que ya hace `community/post/[id]`. Cero migraciones,
  cero cambio en la superficie de seguridad, y controlás campo por campo qué sale.
- **(B) Grants de `SELECT` a `anon` en RLS** — dejaría al cliente leer directo, pero abre `profiles`,
  `community_posts`, etc. al mundo y hay que re-auditar todo lo que se cerró a mano (las listas de
  seguidores privadas del 2026-07-13, el score oculto hasta votar del 2026-07-15).

**Recomendación: (A).** Es el precedente del repo y el riesgo es mucho menor.

**La paginación no es un problema** (verificado): `InfiniteFeed.tsx` no habla con Supabase desde el
cliente — llama a `loadMorePosts()`, un **server action** en `(tabs)/community/actions.ts`. O sea que
ya corre en el servidor y solo hay que hacer que use el admin client cuando no hay sesión. No hacen
falta route handlers nuevos.

### 3. Dónde está el muro (la decisión de más valor)

El instinto es poner el muro en el botón "Analizar mi look". **Es el peor lugar posible.** El muro
tiene que estar donde la inversión del usuario es máxima y el costo nuestro sigue siendo cero:

1. Elegir ocasión → **gratis**, sin costo.
2. Sacar/subir la foto → **gratis**, sin costo (`compressImage` ya corre en el cliente).
3. Tocar "Analizar" → **acá está el muro**, justo antes de la llamada a OpenAI.

El usuario ya eligió, ya posó, ya subió la foto. Quiere su score. Ese es el momento de máxima
conversión, y no nos costó un centavo de IA llegar hasta ahí. Además el scoring **tiene que** estar
detrás del registro igual, porque si no el rate limit por usuario del `0018` no aplica y quedás
expuesto a que te quemen el presupuesto de OpenAI desde cualquier IP.

La foto tiene que sobrevivir al registro: guardar el blob ya comprimido en IndexedDB (no
sessionStorage — puede superar el límite de ~5MB), registrar, subir después. Si el blob se pierde,
el usuario se registró para nada y lo perdiste ahí mismo.

**Esto es viable gracias a un detalle de configuración** (verificado): `enable_confirmations = false`
en `supabase/config.toml` — el registro **no tiene vuelta por email**, `signUp()` devuelve sesión en
el acto (está comentado en `register/page.tsx`). El usuario nunca sale del browser, así que el blob
en IndexedDB sigue ahí. Si en algún momento se prende la confirmación por email, **este diseño se
rompe**: el link de confirmación puede abrir en el webview de Gmail, otro contexto, sin IndexedDB. Si
eso pasa, la salida es subir la foto a un bucket temporal con un token en la URL. Dejar constancia:
prender la confirmación de email tiene un costo escondido acá.

**Muros por acción:** puntuar (antes de la IA), votar / "siguiente" en el deck, like, comentar,
seguir, publicar.
**Pantallas sin nada que mostrar** (`/history`, `/profile`): no gatearlas con redirect — mostrar un
estado vacío con el gancho ("acá van a estar tus looks") y el registro. Un redirect a `/welcome`
rompe la sensación de estar adentro.

### 4. El muro es un bottom sheet, no un redirect

`src/components/ui/BottomSheet.tsx` ya existe. Sacar al usuario de la pantalla a `/welcome` le corta
el contexto y le hace perder de vista qué estaba por hacer. El sheet aparece sobre el contenido,
dice qué gana ("Registrate para votar este look") y deja el fondo visible. El redirect a `/welcome`
queda como fallback para navegación directa a rutas privadas.

### 5. Preservar la intención

Hay dos mecanismos distintos y hacen falta los dos:

- **Ruta** — ya existe: `?next=` en `updateSession`. No hay que construirlo.
- **Acción** — no existe. Guardar la intención pendiente (`{ type: "vote", postId, bucket }`) en
  sessionStorage antes de mandar a registro, y reproducirla al volver.

**El obstáculo:** el gate de onboarding se mete en el medio. El recorrido real es
`muro → /register → /onboarding (género) → replay`. El `next` tiene que sobrevivir ese salto, y hoy
`updateSession` hace `url.search = ""` al redirigir a `/onboarding` — **pierde el parámetro**. Es un
cambio chico pero es el punto exacto donde se rompe silenciosamente toda la conversión, y no se nota
en QA si probás con un usuario ya onboardeado. Tratarlo como ítem propio.

## Fases

**Fase 1 — Navegar la comunidad como invitado. ✅ HECHA** (ver más abajo qué cambió del plan).

**Fase 2 — Capturar como invitado.** `/analysis/new` y `/analysis/new/capture` públicas, blob en
IndexedDB, muro antes de la IA, replay post-registro (subida + análisis). Es la fase de más valor y
la de más partes móviles: depende de que la Fase 1 haya dejado el mecanismo de intención andando.

**Fase 3 — El deck de votos.** `VoteDeck` es el gancho más fuerte y el más delicado: si el invitado
vota, el voto no puede contar (no hay usuario), y hay que decidir qué pasa con el "score oculto hasta
votar". Ver preguntas abiertas.

## Lo que la Fase 1 encontró y cambió del plan

**El plan asumía un feed público que no existía.** Comunidad tiene exactamente dos modos y los dos
son personalizados: "Votá" (`loadVoteQueue`, que arrancaba con `if (!user) return []`) y "Siguiendo"
(filtra por a quién seguís). Las viejas popular/reciente estaban retiradas a propósito. O sea que no
había *nada* que abrirle a un invitado. Hubo que agregar una tab **"Descubrí"**: los posts recientes
sin personalizar, que es `loadCommunityFeed` sin el filtro de follows. Está disponible también para
los logueados —si registrarse te sacara un feed que estabas disfrutando sería absurdo— pero su tab
por defecto sigue siendo "Votá", así que para ellos no cambia nada salvo que ganan una pestaña.

**Las tabs Votá y Siguiendo se le muestran igual al invitado, y abren el muro.** Esconderlas
desperdiciaba la mejor vidriera que tiene la app.

**El `next` se perdía en el onboarding, como estaba previsto — y era peor de lo que decía el brief.**
No solo `updateSession` borraba el `search`: `onboarding/page.tsx` hacía
`window.location.assign("/home")` hardcodeado en los dos caminos (el submit y el de idempotencia).
Arreglados los tres puntos. Ojo que esto **no era solo un problema del modo invitado**: todo registro
que viniera de un link de post compartido ya perdía el destino.

**`BottomSheet` estaba escrito pero sin ningún consumidor, y estaba roto para esta app:** `fixed
inset-x-0 z-30` se escapaba de la columna de 430px en desktop y quedaba por debajo de la tabbar
(`z-index: 55`). Corregido en la primitiva.

## Riesgos

- **Exposición de datos.** El service role bypassa RLS: todo lo que salga de un `createAdminClient()`
  hay que elegirlo campo por campo. Ya cerraste cosas a mano (seguidores privados, score oculto);
  cada pantalla nueva puede reabrirlas sin que RLS te frene. Es el riesgo principal del approach (A).
- **El rewrite de `/`.** Si el invitado puede navegar la app, ¿la landing sigue siendo la puerta?
  Tocar esto sin querer degrada campañas pagas activas. Recomiendo no tocarlo en Fase 1 y sumar un
  "Ver la comunidad" dentro de `landing.html` como entrada al modo invitado.
- **Costo de egress y scraping.** Las fotos pasan a ser servidas a anónimos. `signedPhotoUrl` y las
  policies de storage (`0006`/`0007`) hay que revisarlas contra el caso sin sesión.
- **Contenido público sin moderación.** La comunidad abierta al mundo es distinto a abierta a
  usuarios registrados. Cruzar con el bloqueo de usuarios del `0019`.
- **La app en las stores.** Apple pide que se pueda ver contenido sin cuenta (guideline 5.1.1(v):
  no exigir registro si no es funcionalmente necesario). Esto juega a favor si más adelante van a las
  stores — pero eso no es razón para hacerlo ahora; la razón es el embudo.

## Métricas (sin esto no sirve de nada)

Los eventos actuales (`signed_up`, `occasion_selected`, `photo`, `score_viewed`…) miden el embudo
**después** del registro. El invitado es justo el tramo que hoy es invisible. Hacen falta:

- `guest_session_started` — un invitado empezó a navegar.
- `guest_wall_hit` con `{ action }` — **el evento clave**: dice qué acción convierte y cuál no.
- `guest_converted` con `{ action, seconds_to_convert }` — el muro que efectivamente registra.
- `guest_intent_replayed` — la acción se completó post-registro (detecta la rotura del `next`).

La comparación que decide si esto fue buena idea: registros por visitante único, antes vs. después.
Ojo que el número absoluto de registros puede **bajar** mientras el producto mejora — vas a filtrar
curiosos que antes se registraban a ciegas. Mirar registro→primer análisis→D7, no el bruto.

## Preguntas abiertas (necesitan decisión de producto, no de código)

1. **¿Cuántos votos gratis en el deck?** Cero (muro en el primero) es lo más simple y lo más seguro
   para la integridad del score. Dos o tres construyen el hábito antes de pedir. Me inclino por 3 y
   medirlo, pero implica decidir qué mostrar en el reveal si el invitado no votó de verdad.
2. **¿El invitado ve scores reales o difuminados?** Si ve todos los scores gratis, ¿qué gana
   registrándose? La respuesta razonable: ve los scores (es la prueba de valor) pero no puede
   opinar ni tener los propios.
3. **¿La landing sigue siendo la puerta de `/`, o el invitado entra directo a la comunidad?** Afecta
   campañas activas. Recomiendo A/B, no un switch.
