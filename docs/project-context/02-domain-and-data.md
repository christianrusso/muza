# Dominio, datos y seguridad

## Entidades principales

### Perfil y autenticación

Supabase Auth es la fuente de identidad. `public.profiles` se crea mediante trigger al crear un usuario y contiene nombre, avatar, género, preferencias, plan, estado de bloqueo y `first_shared_at` (primera vez que compartió un look; alimenta el gate de colorimetría).

El onboarding guarda una de estas preferencias:

- `femenino`
- `masculino`
- `no_especifica`

El género sirve para ajustar criterios de moda; nunca debe convertirse en una evaluación del cuerpo.

### Análisis

`analyses` pertenece a un usuario y contiene ocasión, variante, contexto libre, foto privada, tipo de análisis, estado de validación, score y metadatos del resultado.

Tipos de análisis:

- `completo`
- `superior`
- `inferior`
- `individual`

Estados de validación:

- `pending`
- `valid`
- `partial`
- `invalid`

Los detalles normalizados viven en `analysis_categories` y `analysis_feedback`. Las categorías del score son ocasión, fit, colores, coherencia, calzado, proporciones, accesorios, estado de prendas, modernidad y originalidad.

### Comunidad

Relaciones principales:

```text
profile ──< analyses ──< analysis_categories
    │          │
    │          └── community_posts ──< post_comments
    │                               ├── post_reactions
    │                               └── post_votes
    └──────────────────────────────< follows
```

- `community_posts`: publica un análisis una sola vez; contiene caption y fecha.
- `post_reactions`: like/dislike por usuario y post, único por pareja.
- `post_comments`: comentario de texto con autor, post y fecha.
- `comment_reports`: reportes con snapshots, categoría y estado de moderación.
- `post_votes`: voto del juego/comunidad con la franja elegida.
- `follows`: relación follower/following, sin auto-follow.
- `community_feed_view`: vista de lectura para posts, foto, autor, score y contadores.

La comunidad tiene lectura pública de posts/fotos mediante views y Storage; comentarios y acciones requieren usuario autenticado según RLS.

### Actividad

La actividad se deriva de likes, comentarios y follows sobre los posts del usuario. `profiles.activity_seen_at` y `unread_activity_count()` sostienen el badge de no leídas.

### Colorimetría

`colorimetries` es **una por usuario** (`unique(user_id)`): describe la coloración natural (temporada, subtono, paleta, recomendaciones) guardada como `jsonb`. Regenerarla hace upsert, no acumula. Las fotos de origen viven en `colorimetry_photos` (bucket privado).

Generar la colorimetría tiene costo de IA, así que está detrás de un **gate de participación** (`src/lib/colorimetry/eligibility.ts`). Requisitos actuales para desbloquearla:

- **Compartir un look** al menos una vez (`profiles.first_shared_at` no nulo).
- **5 votos** en la comunidad (`post_votes`).

El share es un **gate blando**: compartir un score externo (WhatsApp/IG) no es verificable en el server, así que el flag `first_shared_at` lo setea el cliente vía `POST /api/me/shared` cuando el usuario toca compartir en el resultado (idempotente: solo la primera vez). La intención es empujar shares reales, no impedir el bypass. Antes el gate pedía además subir un post y comentar; se sacaron para bajar fricción y medir demanda real de colorimetría.

### Reto del día

`daily_challenges` es un reto **global por día** (`challenge_date` PK): 3 looks de la comunidad de la misma ocasión (`look_ids`, orden barajado) y el `winner_post_id` (el de mayor score IA). Se genera on-demand con service-role la primera vez que alguien lo abre en el día; lectura pública (el invitado juega). `challenge_attempts` guarda la respuesta del usuario (`picked_post_id`, `correct`), única por `(user, challenge_date)`, sin update. Los scores no se guardan: se leen de `community_feed_view` al revelar. Racha = días jugados consecutivos. Ver [`specs/feat-3-reto-del-dia/`](../../specs/feat-3-reto-del-dia/README.md).

### Planes

`profiles.plan_tier` distingue `free` y `pro`. En el lanzamiento ambos tienen análisis e historial ilimitados desde `src/lib/plans/limits.ts`; los valores de límites y precio son placeholders para monetización futura.

No activar topes o cobro sin actualizar simultáneamente la documentación comercial, la configuración y los tests.

## Base de datos y migraciones

Las migraciones son acumulativas y se aplican en orden numérico. Resumen:

- `0001`: perfiles, ocasiones, análisis, categorías, feedback y usage.
- `0002`: comunidad, posts, reacciones, comentarios, follows y feed view inicial.
- `0003`: RLS base.
- `0004`: buckets y políticas de Storage.
- `0005`–`0007`: correcciones de feed y lectura de fotos comunitarias.
- `0008`: índices de performance.
- `0009`–`0011`: ejemplos few-shot y Storage de ejemplos.
- `0012`–`0013`: variantes y contexto de ocasión.
- `0014`: métricas admin.
- `0015`: actividad vista y unread count.
- `0016`: género del perfil.
- `0017`: votos de comunidad.
- `0018`: rate limiting y logging de uso/costo de IA.
- `0019`: bloqueo, políticas de usuarios y RPCs admin.
- `0020`: detalle admin de usuario.
- `0021`: niveles de voto actuales y feed actualizado.

Una nueva feature de datos debe agregar una migración nueva, nunca editar una migración histórica ya aplicada.
La migración `0022_comment_reports.sql` agrega reportes, categorías, RPCs atómicas y
ocultamiento público de comentarios mediante `hidden_at`.
Las migraciones `0031_colorimetries.sql` y `0032_colorimetry_photos.sql` agregan la
colorimetría (una por usuario) y sus fotos. `0033_profile_first_shared.sql` agrega
`profiles.first_shared_at` para el gate blando de colorimetría por share.
`0034_daily_challenges.sql` agrega el Reto del día (`daily_challenges` global +
`challenge_attempts` por usuario).

## Storage

Buckets principales:

- `outfit-photos`: privado; el usuario escribe/lee sus fotos y el backend entrega URLs firmadas.
- `avatars`: lectura pública y escritura restringida al propietario.
- `scoring-examples`: ejemplos controlados para few-shot; acceso server-side.

Las fotos privadas no deben exponerse con URLs permanentes ni guardarse en campos públicos de views.

## RLS

La política general es “owner access” para datos privados y lectura autenticada para comunidad. Las políticas importantes están en `0003_rls_policies.sql` y fueron endurecidas en `0019_admin_users.sql` para impedir escrituras de usuarios bloqueados.

Reglas operativas:

- Preferir el cliente normal y RLS para acciones del usuario.
- Usar service-role sólo en backend privilegiado, admin, eliminación de cuenta, cuotas, métricas o operaciones que lo requieran.
- Toda nueva tabla debe habilitar RLS y tener políticas explícitas.
- Toda función `security definer` debe fijar `search_path`, restringir `execute` y validar sus parámetros.

## Privacidad y borrado

El borrado de cuenta elimina el usuario Auth y, por cascada, sus datos relacionados; también elimina fotos y avatar desde el route handler de cuenta. Features que introduzcan auditoría deben decidir explícitamente si usan snapshots, `set null` o cascada para no romper ese flujo.

Los datos de uso documentados incluyen cuenta, fotos, análisis, puntajes, publicaciones, likes y comentarios. La política de privacidad vive en `/legal` y debe actualizarse si se agregan nuevas categorías de datos.
