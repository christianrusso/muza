-- Muza — los votos también cuentan como novedad
--
-- unread_activity_count() (ver 0015) sumaba likes + comentarios, pero no votos:
-- post_votes es una tabla aparte (ver 0017) y quedó fuera. Como votar es la
-- acción principal de la app, el feedback más frecuente era justo el único que
-- no notificaba: el autor no se enteraba de que su look se estaba votando.
--
-- El autor ve un resumen, nunca quién votó qué: acá solo se cuenta, y
-- loadActivity() agrupa por post (ver src/lib/community/activity.ts). Los votos
-- individuales no salen del agregado.

begin;

create or replace function public.unread_activity_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select id, last_seen_activity_at
    from public.profiles
    where id = auth.uid()
  )
  select (
    (
      select count(*)
      from public.post_reactions r
      join public.community_posts cp on cp.id = r.post_id
      where cp.user_id = (select id from me)
        and r.user_id <> cp.user_id
        and r.reaction = 'like'
        and r.created_at > (select last_seen_activity_at from me)
    )
    +
    (
      select count(*)
      from public.post_comments c
      join public.community_posts cp on cp.id = c.post_id
      where cp.user_id = (select id from me)
        and c.user_id <> cp.user_id
        and c.created_at > (select last_seen_activity_at from me)
    )
    +
    -- Votos nuevos sobre mis posts. Se cuenta 1 por post con votos nuevos, no 1
    -- por voto: el badge tiene que decir "hay novedades", y con el volumen que
    -- tiene votar, contar de a uno lo dispararía a números sin sentido.
    (
      select count(distinct v.post_id)
      from public.post_votes v
      join public.community_posts cp on cp.id = v.post_id
      where cp.user_id = (select id from me)
        and v.user_id <> cp.user_id
        and v.created_at > (select last_seen_activity_at from me)
    )
  )::int;
$$;

commit;
