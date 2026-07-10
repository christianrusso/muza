# Data model

Fuente: `supabase/migrations/0001_init.sql` → `0014_admin_metrics.sql`. Para políticas RLS, storage y funciones ver [05-database.md](./05-database.md).

## Tablas núcleo de usuario

**`profiles`** (1:1 con `auth.users`)
- `id uuid PK` (= `auth.users.id`, `on delete cascade`)
- `full_name text not null`, `avatar_url text`
- `notifications_enabled boolean default true`
- `plan_tier text default 'free'` (check `free|pro`)
- `plan_started_at timestamptz`, `created_at timestamptz`
- Se crea automáticamente vía trigger `on_auth_user_created` → función `handle_new_user()` al insertar en `auth.users` (extrae `full_name`/`avatar_url` de metadata OAuth o del email).

**`occasions`** (lookup/seed, 9 filas fijas)
- `id text PK` (`casual`, `work`, `gym`, `party`, `wedding`, `date`, `interview`, `travel`, `other`)
- `label_es text`, `icon_name text`, `sort_order int`

## Análisis de outfit

**`analyses`** — entidad central
- `id uuid PK`, `user_id → profiles`, `occasion_id → occasions`
- `occasion_variant text` (nullable, sub-contexto ej. "Fiesta de Noche", migración `0012`)
- `occasion_context text` (nullable, texto libre del usuario, migración `0013`)
- `photo_path text`, `analysis_type` (check `completo|superior|inferior|individual`)
- `validity_status` (check `pending|valid|partial|invalid`, default `pending`)
- `overall_score int` (0-100), `qualitative_badge text`
- `style_descriptors text[]`, `detected_prendas_superiores/inferiores/calzado/accesorios/colores text[]`, `detected_estilo text`
- `ai_raw_response jsonb` (respuesta cruda del modelo, auditoría/debug)
- Índices: `(user_id, created_at desc)`, `(user_id, analysis_type)`

**`analysis_categories`** — 10 filas por análisis (una por categoría de scoring)
- `analysis_id → analyses (cascade)`, `category_key` (check, uno de los 10 keys — ver [06-scoring-engine.md](./06-scoring-engine.md))
- `weight numeric (0,1]`, `score int (0-100)`, `justification text`
- `unique(analysis_id, category_key)`

**`analysis_feedback`** — N filas por análisis (fortalezas/mejoras/recomendaciones)
- `analysis_id → analyses (cascade)`, `kind` (check `fortaleza|aspecto_mejorar|recomendacion`)
- `text text`, `sort_order int`

**`plan_usage`** — contador mensual para gating
- PK compuesta `(user_id, period_month)`, `analyses_count int default 0`
- Solo se escribe vía RPC `increment_analysis_usage()` (nunca directo, ver [05-database.md](./05-database.md))

**`scoring_examples`** — banco few-shot para calibrar IA (migración `0009`)
- `photo_path text`, `occasion_id → occasions`, `verdict` (check `good|bad`), `note text`, `active boolean default true`
- Índice parcial `(occasion_id) where active`

## Comunidad

**`community_posts`**
- `user_id → profiles`, `analysis_id → analyses` (**unique** — un análisis solo puede tener un post), `caption text`, `created_at`

**`post_reactions`**
- `post_id → community_posts`, `user_id → profiles`, `reaction` (check `like|dislike`)
- `unique(post_id, user_id)` → **un usuario solo puede tener una reacción por post** (no puede likear y dislikear a la vez, ni likear dos veces)

**`post_comments`**
- `post_id → community_posts`, `user_id → profiles`, `body text` — sin unique, múltiples comentarios permitidos

**`follows`**
- PK compuesta `(follower_id, following_id)`, ambos `→ profiles`
- `check (follower_id <> following_id)` — no te podés seguir a vos mismo

**View `community_feed_view`** (no es tabla — join precalculado)
- Combina `community_posts` + `profiles` (autor) + `analyses` (foto/score/ocasión)
- Expone `like_count`, `dislike_count`, `comment_count` como subconsultas correlacionadas
- `security_invoker = false` (importante, ver [05-database.md](./05-database.md))

## Diagrama de relaciones (simplificado)

```
auth.users 1─1 profiles
profiles 1─N analyses ──1─N── analysis_categories
                       └─1─N── analysis_feedback
profiles 1─1 (por mes) plan_usage
analyses 1─0/1 community_posts ─1─N─ post_reactions
                                └─1─N─ post_comments
profiles N─N profiles (vía follows)
occasions 1─N analyses
occasions 1─N scoring_examples
```
