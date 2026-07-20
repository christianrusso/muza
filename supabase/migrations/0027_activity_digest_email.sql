-- ============================================================================
-- Email de actividad (digest diario) — el "timbre" que hoy está desconectado
-- ============================================================================
-- La app ya calcula la actividad sobre los posts propios (likes, comentarios,
-- follows, votos; ver unread_activity_count y loadActivity), pero solo como badge
-- IN-APP: no sirve para retención porque solo se ve si el usuario ya volvió.
--
-- Esto agrega el canal saliente: un digest diario con lo acumulado desde el
-- último mail. El opt-in reusa profiles.notifications_enabled (ya existe en
-- settings y nada lo consumía). El unsubscribe del mail apaga ese flag.
-- ============================================================================

begin;

alter table public.profiles
  -- Hasta cuándo ya se le mandó digest. Default now(): al migrar, los usuarios
  -- existentes arrancan "al día", así que el primer digest solo cubre actividad
  -- POSTERIOR a esta migración (no un mail gigante con todo el historial).
  add column last_activity_email_at timestamptz not null default now(),
  -- Token para el link de baja de un click, sin login (requisito legal del mail).
  add column unsubscribe_token uuid not null default gen_random_uuid();

-- Por usuario: la actividad NUEVA (desde last_activity_email_at) sobre sus posts,
-- + su email de auth.users. Solo usuarios con notificaciones ON, no bloqueados,
-- no seed, y que efectivamente tengan novedades. security definer: necesita leer
-- auth.users y cruzar tablas sin depender del RLS del que la invoca (la corre el
-- cron con service role).
create or replace function public.activity_digest_pending()
returns table (
  user_id uuid,
  email text,
  full_name text,
  unsubscribe_token uuid,
  new_likes bigint,
  new_comments bigint,
  new_follows bigint,
  new_vote_posts bigint,
  new_votes bigint
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
    coalesce(v.votes, 0)
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
  where p.notifications_enabled = true
    and p.blocked_at is null
    and p.is_seed = false
    and u.email is not null
    and (coalesce(l.cnt, 0) + coalesce(c.cnt, 0) + coalesce(f.cnt, 0) + coalesce(v.votes, 0)) > 0;
$$;

commit;
