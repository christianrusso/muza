# Dominio, datos y seguridad

## Entidades principales

### Perfil y autenticación

Supabase Auth es la fuente de identidad. `public.profiles` se crea mediante trigger al crear un usuario y contiene nombre, avatar, género, preferencias, plan y estado de bloqueo.

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
