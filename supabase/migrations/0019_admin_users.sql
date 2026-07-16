-- Gestión de usuarios desde el panel /admin: listado con métricas por usuario y
-- bloqueo/desbloqueo.
--
-- El bloqueo tiene dos capas, porque ninguna de las dos alcanza sola:
--   1. auth.users.banned_until (lo setea el server con la service-role key vía
--      la Admin API, no acá): impide login y refresh del token.
--   2. profiles.blocked_at + public.is_blocked() en las policies de RLS: corta
--      TODA escritura del usuario de inmediato, incluso si todavía le queda un
--      access token vivo de antes del bloqueo (duran hasta 1h).
-- Desbloquear revierte las dos.

-- ============================================================================
-- Marca de bloqueo
-- ============================================================================
alter table public.profiles add column if not exists blocked_at timestamptz;

create index if not exists profiles_blocked_at_idx
  on public.profiles (blocked_at) where blocked_at is not null;

-- Se usa dentro de las policies de RLS, así que la ejecuta el rol del usuario
-- (authenticated). security definer para que no dependa de poder leer profiles.
create or replace function public.is_blocked(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and blocked_at is not null
  );
$$;

grant execute on function public.is_blocked(uuid) to authenticated;

-- ============================================================================
-- Policies: un usuario bloqueado no escribe nada. La lectura queda intacta —
-- si entra con un token viejo ve la app en modo mirar-y-no-tocar hasta que el
-- token expira y el ban de auth lo deja afuera del login.
-- ============================================================================
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id and not public.is_blocked(auth.uid()));

drop policy if exists "analyses_owner_insert" on public.analyses;
create policy "analyses_owner_insert" on public.analyses
  for insert to authenticated with check (
    auth.uid() = user_id and not public.is_blocked(auth.uid())
  );

drop policy if exists "community_posts_owner_insert" on public.community_posts;
create policy "community_posts_owner_insert" on public.community_posts
  for insert to authenticated with check (
    auth.uid() = user_id
    and not public.is_blocked(auth.uid())
    and exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid())
  );

drop policy if exists "post_comments_owner_insert" on public.post_comments;
create policy "post_comments_owner_insert" on public.post_comments
  for insert to authenticated with check (
    auth.uid() = user_id and not public.is_blocked(auth.uid())
  );

drop policy if exists "post_reactions_owner_insert" on public.post_reactions;
create policy "post_reactions_owner_insert" on public.post_reactions
  for insert to authenticated with check (
    auth.uid() = user_id and not public.is_blocked(auth.uid())
  );

drop policy if exists "post_reactions_owner_update" on public.post_reactions;
create policy "post_reactions_owner_update" on public.post_reactions
  for update to authenticated using (
    auth.uid() = user_id and not public.is_blocked(auth.uid())
  );

drop policy if exists "post_votes_owner_insert" on public.post_votes;
create policy "post_votes_owner_insert" on public.post_votes
  for insert to authenticated with check (
    auth.uid() = user_id and not public.is_blocked(auth.uid())
  );

drop policy if exists "post_votes_owner_update" on public.post_votes;
create policy "post_votes_owner_update" on public.post_votes
  for update to authenticated using (
    auth.uid() = user_id and not public.is_blocked(auth.uid())
  );

drop policy if exists "follows_owner_insert" on public.follows;
create policy "follows_owner_insert" on public.follows
  for insert to authenticated with check (
    auth.uid() = follower_id and not public.is_blocked(auth.uid())
  );

-- ============================================================================
-- Listado de usuarios con sus métricas, en una sola función (mismo criterio que
-- admin_metrics: agregamos en Postgres y devolvemos jsonb). security definer
-- porque necesita leer auth.users para el email y la última sesión.
-- ============================================================================
create or replace function public.admin_users_list(
  p_search text default null,
  p_limit int default 500
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  from (
    select
      p.id,
      p.full_name,
      p.avatar_url,
      u.email,
      p.plan_tier,
      p.gender,
      p.created_at,
      p.blocked_at,
      u.last_sign_in_at,
      (select count(*) from public.analyses a where a.user_id = p.id) as analyses,
      (select count(*) from public.analyses a
        where a.user_id = p.id and a.validity_status = 'valid') as analyses_valid,
      (select round(avg(a.overall_score)) from public.analyses a
        where a.user_id = p.id and a.overall_score is not null) as avg_score,
      (select max(a.created_at) from public.analyses a where a.user_id = p.id) as last_analysis_at,
      (select count(*) from public.community_posts cp where cp.user_id = p.id) as posts,
      (select count(*) from public.post_comments c where c.user_id = p.id) as comments,
      (select count(*) from public.post_votes v where v.user_id = p.id) as votes,
      (select count(*) from public.post_reactions r
        where r.user_id = p.id and r.reaction = 'like') as likes_given,
      (select count(*) from public.post_reactions r
         join public.community_posts cp on cp.id = r.post_id
        where cp.user_id = p.id and r.reaction = 'like') as likes_received,
      (select count(*) from public.follows f where f.following_id = p.id) as followers,
      (select count(*) from public.follows f where f.follower_id = p.id) as following,
      (select coalesce(sum(l.estimated_cost_usd), 0) from public.ai_usage_log l
        where l.user_id = p.id) as ai_cost_usd
    from public.profiles p
    left join auth.users u on u.id = p.id
    where
      p_search is null
      or btrim(p_search) = ''
      or p.full_name ilike '%' || btrim(p_search) || '%'
      or u.email ilike '%' || btrim(p_search) || '%'
    order by p.created_at desc
    limit p_limit
  ) t;
$$;

revoke all on function public.admin_users_list(text, int) from public;
revoke all on function public.admin_users_list(text, int) from anon;
revoke all on function public.admin_users_list(text, int) from authenticated;
grant execute on function public.admin_users_list(text, int) to service_role;

-- ============================================================================
-- Bloquear / desbloquear. Idempotente: re-bloquear no pisa la fecha original.
-- ============================================================================
create or replace function public.admin_set_user_blocked(
  p_user_id uuid,
  p_blocked boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocked_at timestamptz;
begin
  update public.profiles
     set blocked_at = case when p_blocked then coalesce(blocked_at, now()) else null end
   where id = p_user_id
  returning blocked_at into v_blocked_at;

  if not found then
    raise exception 'No existe el usuario %', p_user_id;
  end if;

  return v_blocked_at;
end;
$$;

revoke all on function public.admin_set_user_blocked(uuid, boolean) from public;
revoke all on function public.admin_set_user_blocked(uuid, boolean) from anon;
revoke all on function public.admin_set_user_blocked(uuid, boolean) from authenticated;
grant execute on function public.admin_set_user_blocked(uuid, boolean) to service_role;
