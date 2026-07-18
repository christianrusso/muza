-- ============================================================================
-- Los votos de comunidad pasan a los 4 niveles de la escala
-- ============================================================================
-- Antes había tres escalas conviviendo y el mismo número significaba cosas
-- distintas: la landing mostraba 0-59/60-79/80-100, la app pintaba verde desde
-- 75, y los votos usaban menos-de-25 / 25-75 / más-de-75.
--
-- Al recalibrar el puntaje (spreadScore), los scores reales pasaron a caer entre
-- ~45 y ~80, así que el bucket 'mid' (25-75) se comía casi todo: adivinar "Medio"
-- acertaba siempre y el juego perdía sentido. Ahora los votos SON los 4 niveles
-- de SCORE_LEVELS (lib/scoring/categories), que es la única fuente de verdad:
--
--   mejorar    0 – 44    (rojo)
--   bien      45 – 64    (ámbar)
--   muy_bueno 65 – 79    (lima)
--   impecable 80 – 100   (verde)
--
-- Los votos ya emitidos se conservan, mapeados por equivalencia. 'impecable'
-- arranca vacío: es el escalón nuevo y nadie pudo haberlo votado.
-- ============================================================================

-- 1) Sacar el check viejo para poder reescribir los valores.
alter table public.post_votes drop constraint if exists post_votes_bucket_check;

-- 2) Migrar los votos existentes. El orden importa: 'mid' → 'bien' antes de que
--    'bien' pueda chocar con nada, y 'high' → 'muy_bueno' (no 'impecable',
--    porque el viejo 'high' arrancaba en 75 sobre la escala vieja sin estirar).
update public.post_votes set bucket = 'mejorar'   where bucket = 'low';
update public.post_votes set bucket = 'bien'      where bucket = 'mid';
update public.post_votes set bucket = 'muy_bueno' where bucket = 'high';

-- 3) Check nuevo con los 4 niveles.
alter table public.post_votes
  add constraint post_votes_bucket_check
  check (bucket in ('mejorar', 'bien', 'muy_bueno', 'impecable'));

-- 4) La vista expone un conteo por nivel. No se puede usar `create or replace`
--    porque cambian las últimas columnas (no solo se agregan): hay que dropearla
--    y recrearla. No hay objetos de base dependientes — solo la consulta la app.
drop view if exists public.community_feed_view;

create view public.community_feed_view as
select
  cp.id as post_id,
  cp.caption,
  cp.created_at as posted_at,
  p.id as author_id,
  p.full_name as author_name,
  p.avatar_url as author_avatar_url,
  a.id as analysis_id,
  a.photo_path,
  a.occasion_id,
  a.analysis_type,
  a.overall_score,
  a.style_descriptors,
  (select count(*) from public.post_reactions r where r.post_id = cp.id and r.reaction = 'like') as like_count,
  (select count(*) from public.post_reactions r where r.post_id = cp.id and r.reaction = 'dislike') as dislike_count,
  (select count(*) from public.post_comments c where c.post_id = cp.id) as comment_count,
  p.gender as author_gender,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'mejorar') as votes_mejorar,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'bien') as votes_bien,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'muy_bueno') as votes_muy_bueno,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'impecable') as votes_impecable
from public.community_posts cp
join public.profiles p on p.id = cp.user_id
join public.analyses a on a.id = cp.analysis_id;

-- Mismo criterio que antes (ver 0005 y 0017): corre con privilegios del owner
-- para que cualquier autenticado vea los posts publicados sin relajar el RLS de
-- analyses.
alter view public.community_feed_view set (security_invoker = false);
