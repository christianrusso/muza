# Base de datos (Supabase)

Postgres gestionado por Supabase. Migraciones versionadas en `supabase/migrations/`, 14 archivos a la fecha de este research — se leen en orden, cada una es un paso incremental (incluye al menos dos migraciones que son fixes de bugs de seguridad sobre migraciones anteriores, ver abajo).

## Row Level Security (RLS)

Habilitado en: `profiles, occasions, analyses, analysis_categories, analysis_feedback, plan_usage, community_posts, post_reactions, post_comments, follows, scoring_examples`.

Patrón general: **selects abiertos a autenticados donde hace falta mostrar contenido de otros usuarios (comunidad), writes siempre owner-only** vía `auth.uid() = user_id` (directo o por subquery hacia la tabla padre):

| Tabla | Select | Insert/Update/Delete |
|---|---|---|
| `profiles` | cualquier autenticado | solo `auth.uid() = id` |
| `occasions` | público | — (solo seed por migración) |
| `analyses` / `analysis_categories` / `analysis_feedback` | owner-only | owner-only |
| `plan_usage` | owner-only | ninguno directo — solo vía RPC `increment_analysis_usage` |
| `community_posts` | autenticados | insert requiere ser owner del `user_id` Y de la `analysis_id` referenciada; delete owner-only |
| `post_reactions` / `post_comments` | autenticados | owner-only |
| `follows` | autenticados | owner-only (solo el propio `follower_id`) |
| `scoring_examples` | autenticados | ninguno (solo `service_role`) |

Comentario explícito en la migración `0003`: "Community visibility goes through `community_feed_view`, not by relaxing these policies" — es decir, `analyses` sigue siendo owner-only incluso para posts públicos; la visibilidad pública pasa por la vista, no por abrir la tabla.

## Storage

Dos buckets principales:
- **`outfit-photos`** (privado): path `{user_id}/{analysis_id}.jpg`. Acceso solo por signed URLs generadas server-side. Policy de owner (`storage.foldername(name)[1] = auth.uid()`) + policy adicional `outfit_photos_community_read` para fotos que pertenecen a un post público (ver historial de bugs abajo).
- **`avatars`** (público): path `{user_id}.jpg`, lectura pública, escritura owner-only.
- **`scoring-examples`**: poblado por script con `service_role` (`scripts/eval/import-to-supabase.ts`), lectura para autenticados.

## Funciones SQL custom

- `handle_new_user()` — trigger `after insert on auth.users`, crea la fila en `profiles` (`security definer`). Redefinida en migración `0010` para también capturar avatar de Google OAuth.
- `increment_analysis_usage(p_user_id)` — `security definer`, único punto de escritura de `plan_usage` (upsert con incremento).
- `is_community_photo(p_photo_path)` — `security definer stable`, usada por la policy de storage para chequear pertenencia a un post sin que la RLS del caller bloquee la subquery.
- `admin_metrics()` — `security invoker`, agrega métricas de negocio en un jsonb (usuarios, análisis, comunidad, top users/posts). Permisos revocados para todos excepto `service_role`.

## Historial de bugs de seguridad/RLS

Vale la pena conocer este historial antes de tocar RLS, vistas o policies de storage — ya se pisaron estos rastrillos una vez:

1. **`community_feed_view` con `security_invoker = true` (migración `0002`)** rompía el feed: al correr con los permisos del usuario que consulta, aplicaba la policy owner-only de `analyses` y nadie veía posts ajenos. **Fix en `0005`**: `security_invoker = false`.
2. **Policy `outfit_photos_community_read` (migración `0006`)** intentaba permitir ver fotos de posts públicos con una subquery directa en la policy — mismo problema: la subquery corre bajo el RLS del caller y no veía las filas necesarias. **Fix en `0007`**: mover la lógica a una función `security definer` (`is_community_photo`) y hacer que la policy llame a la función en vez de tener la subquery inline.

Lección para trabajo futuro: **cualquier policy o vista que necesite cruzar datos de otro usuario debe decidir explícitamente su modo de seguridad** (`security definer`/`security_invoker=false`), nunca asumir que una subquery "ve todo" dentro de una policy RLS.

## Workflow de migraciones

No hay evidencia de un pipeline de CI que corra las migraciones automáticamente (ver [risks.md](./risks.md)) — se gestionan con la CLI de Supabase (`supabase/config.toml` presente) de forma manual/local.
