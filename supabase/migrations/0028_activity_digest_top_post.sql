-- ============================================================================
-- El digest linkea al LOOK, no a la solapa de actividad
-- ============================================================================
-- El mail llevaba a /community/activity (la lista de novedades). Mejor lleva
-- directo al look que recibió la actividad. Como el digest agrega varios posts
-- de un usuario, elegimos el "top": el que más actividad nueva juntó desde el
-- último mail (desempate: el más reciente).
--
-- Agrega top_post_id al retorno. Cambiar el RETURNS TABLE obliga a DROP + CREATE
-- (create or replace no permite cambiar la firma de salida).
-- ============================================================================

begin;

drop function if exists public.activity_digest_pending();

create function public.activity_digest_pending()
returns table (
  user_id uuid,
  email text,
  full_name text,
  unsubscribe_token uuid,
  new_likes bigint,
  new_comments bigint,
  new_follows bigint,
  new_vote_posts bigint,
  new_votes bigint,
  top_post_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    u.email,
    p.full_name,
    p.unsubscribe_token,
    coalesce(l.cnt, 0),
    coalesce(c.cnt, 0),
    coalesce(f.cnt, 0),
    coalesce(v.posts, 0),
    coalesce(v.votes, 0),
    tp.post_id
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select count(*) as cnt
    from public.post_reactions r
    join public.community_posts cp on cp.id = r.post_id
    where cp.user_id = p.id and r.user_id <> p.id and r.reaction = 'like'
      and r.created_at > p.last_activity_email_at
  ) l on true
  left join lateral (
    select count(*) as cnt
    from public.post_comments cm
    join public.community_posts cp on cp.id = cm.post_id
    where cp.user_id = p.id and cm.user_id <> p.id and cm.hidden_at is null
      and cm.created_at > p.last_activity_email_at
  ) c on true
  left join lateral (
    select count(*) as cnt
    from public.follows fo
    where fo.following_id = p.id and fo.follower_id <> p.id
      and fo.created_at > p.last_activity_email_at
  ) f on true
  left join lateral (
    select count(distinct vv.post_id) as posts, count(*) as votes
    from public.post_votes vv
    join public.community_posts cp on cp.id = vv.post_id
    where cp.user_id = p.id and vv.user_id <> p.id
      and vv.created_at > p.last_activity_email_at
  ) v on true
  -- Look con más actividad nueva (votos + likes + comentarios) desde el marcador.
  -- Desempata por el más reciente. Puede ser null si la única novedad es un follow
  -- (que no tiene post asociado): en ese caso el mail cae a /community/activity.
  left join lateral (
    select cp.id as post_id
    from public.community_posts cp
    where cp.user_id = p.id
      and (
        (select count(*) from public.post_votes vv where vv.post_id = cp.id and vv.user_id <> p.id and vv.created_at > p.last_activity_email_at)
        + (select count(*) from public.post_reactions r where r.post_id = cp.id and r.user_id <> p.id and r.reaction = 'like' and r.created_at > p.last_activity_email_at)
        + (select count(*) from public.post_comments cm where cm.post_id = cp.id and cm.user_id <> p.id and cm.hidden_at is null and cm.created_at > p.last_activity_email_at)
      ) > 0
    order by (
      (select count(*) from public.post_votes vv where vv.post_id = cp.id and vv.user_id <> p.id and vv.created_at > p.last_activity_email_at)
      + (select count(*) from public.post_reactions r where r.post_id = cp.id and r.user_id <> p.id and r.reaction = 'like' and r.created_at > p.last_activity_email_at)
      + (select count(*) from public.post_comments cm where cm.post_id = cp.id and cm.user_id <> p.id and cm.hidden_at is null and cm.created_at > p.last_activity_email_at)
    ) desc, cp.created_at desc
    limit 1
  ) tp on true
  where p.notifications_enabled = true
    and p.blocked_at is null
    and p.is_seed = false
    and u.email is not null
    and (coalesce(l.cnt, 0) + coalesce(c.cnt, 0) + coalesce(f.cnt, 0) + coalesce(v.votes, 0)) > 0;
$$;

commit;
