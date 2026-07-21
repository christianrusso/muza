-- ============================================================================
-- El digest habla de UN look (el top), no de la suma de todos
-- ============================================================================
-- Antes los conteos (votos/likes/comentarios) se agregaban entre TODOS los posts
-- del usuario, pero el mail decía "tu look" (singular) y linkeaba a uno solo. Un
-- usuario con varios looks veía "30 votaron tu look" y al abrir el look encontraba
-- otro número: se comparaba la suma de N looks contra lo que muestra 1.
--
-- Ahora votos/likes/comentarios son del LOOK con más actividad nueva (el mismo al
-- que linkea el mail), así el número coincide con lo que ve al abrir. Los follows
-- siguen globales: son sobre la persona, no sobre un look.
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
    coalesce(tp.likes, 0),
    coalesce(tp.comments, 0),
    coalesce(f.cnt, 0),
    case when coalesce(tp.votes, 0) > 0 then 1 else 0 end,
    coalesce(tp.votes, 0),
    tp.post_id
  from public.profiles p
  join auth.users u on u.id = p.id
  -- Follows: globales (sobre la persona, no un look).
  left join lateral (
    select count(*) as cnt
    from public.follows fo
    where fo.following_id = p.id and fo.follower_id <> p.id
      and fo.created_at > p.last_activity_email_at
  ) f on true
  -- Look con más actividad nueva + SUS conteos. Solo posts con actividad > 0, así
  -- que si no hay ninguno tp es null (caso follow-only → el mail cae a la solapa).
  left join lateral (
    select
      cp.id as post_id,
      pv.c as votes,
      pl.c as likes,
      pc.c as comments
    from public.community_posts cp
    left join lateral (
      select count(*) as c from public.post_votes vv
      where vv.post_id = cp.id and vv.user_id <> p.id and vv.created_at > p.last_activity_email_at
    ) pv on true
    left join lateral (
      select count(*) as c from public.post_reactions r
      where r.post_id = cp.id and r.user_id <> p.id and r.reaction = 'like' and r.created_at > p.last_activity_email_at
    ) pl on true
    left join lateral (
      select count(*) as c from public.post_comments cm
      where cm.post_id = cp.id and cm.user_id <> p.id and cm.hidden_at is null and cm.created_at > p.last_activity_email_at
    ) pc on true
    where cp.user_id = p.id and (pv.c + pl.c + pc.c) > 0
    order by (pv.c + pl.c + pc.c) desc, cp.created_at desc
    limit 1
  ) tp on true
  where p.notifications_enabled = true
    and p.blocked_at is null
    and p.is_seed = false
    and u.email is not null
    and (coalesce(tp.votes, 0) + coalesce(tp.likes, 0) + coalesce(tp.comments, 0) + coalesce(f.cnt, 0)) > 0;
$$;

commit;
