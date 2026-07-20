-- Feature 2: bloqueo social entre usuarios.
-- (Renumerado 0023 -> 0025 al rebasar sobre main.)
-- Se conserva un registro por cada ciclo de bloqueo para trazabilidad y métricas.

create table public.user_block_history (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  blocked_at timestamptz not null default now(),
  unblocked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_block_history_not_self check (blocker_id <> blocked_id)
);

create unique index user_block_history_active_uidx
  on public.user_block_history (blocker_id, blocked_id)
  where unblocked_at is null;

create index user_block_history_reverse_idx
  on public.user_block_history (blocked_id, blocker_id, unblocked_at);

create index user_block_history_blocked_at_idx
  on public.user_block_history (blocked_at);

create index user_block_history_unblocked_at_idx
  on public.user_block_history (unblocked_at)
  where unblocked_at is not null;

alter table public.user_block_history enable row level security;

-- Internal helper used by views and policies. It intentionally has no client
-- grant: clients use is_blocked_with(), which always anchors the actor to auth.uid().
create or replace function public.users_are_blocked(
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_a is not null
    and p_user_b is not null
    and (auth.uid() = p_user_a or auth.uid() = p_user_b)
    and exists (
      select 1
      from public.user_block_history h
      where h.unblocked_at is null
        and (
          (h.blocker_id = p_user_a and h.blocked_id = p_user_b)
          or (h.blocker_id = p_user_b and h.blocked_id = p_user_a)
        )
    );
$$;

revoke all on function public.users_are_blocked(uuid, uuid) from public;
revoke all on function public.users_are_blocked(uuid, uuid) from anon;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

create or replace function public.is_blocked_with(p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.users_are_blocked(auth.uid(), p_target_id);
$$;

revoke all on function public.is_blocked_with(uuid) from public;
revoke all on function public.is_blocked_with(uuid) from anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;

create or replace function public.is_post_blocked(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.community_posts cp
    where cp.id = p_post_id
      and public.users_are_blocked(auth.uid(), cp.user_id)
  );
$$;

revoke all on function public.is_post_blocked(uuid) from public;
revoke all on function public.is_post_blocked(uuid) from anon;
grant execute on function public.is_post_blocked(uuid) to authenticated;

create or replace function public.set_user_blocked(
  p_blocked_id uuid,
  p_blocked boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_effective_blocked boolean;
begin
  if v_actor is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if p_blocked_id is null or p_blocked_id = v_actor then
    raise exception 'CANNOT_BLOCK_SELF';
  end if;

  if not exists (select 1 from public.profiles where id = p_blocked_id) then
    raise exception 'USER_NOT_FOUND';
  end if;

  if p_blocked then
    insert into public.user_block_history (blocker_id, blocked_id)
    values (v_actor, p_blocked_id)
    on conflict do nothing;

    delete from public.follows
    where (follower_id = v_actor and following_id = p_blocked_id)
       or (follower_id = p_blocked_id and following_id = v_actor);
  else
    update public.user_block_history
       set unblocked_at = now()
     where blocker_id = v_actor
       and blocked_id = p_blocked_id
       and unblocked_at is null;
  end if;

  v_effective_blocked := public.users_are_blocked(v_actor, p_blocked_id);

  return jsonb_build_object(
    'userId', p_blocked_id,
    'blocked', v_effective_blocked
  );
end;
$$;

revoke all on function public.set_user_blocked(uuid, boolean) from public;
revoke all on function public.set_user_blocked(uuid, boolean) from anon;
grant execute on function public.set_user_blocked(uuid, boolean) to authenticated;

create or replace function public.list_my_blocked_users()
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select h.blocked_id, p.full_name, p.avatar_url, h.blocked_at
  from public.user_block_history h
  join public.profiles p on p.id = h.blocked_id
  where h.blocker_id = auth.uid()
    and h.unblocked_at is null
  order by h.blocked_at desc;
$$;

revoke all on function public.list_my_blocked_users() from public;
revoke all on function public.list_my_blocked_users() from anon;
grant execute on function public.list_my_blocked_users() to authenticated;

create policy "user_block_history_owner_select"
  on public.user_block_history
  for select to authenticated
  using (blocker_id = auth.uid());

create policy "user_block_history_owner_insert"
  on public.user_block_history
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy "user_block_history_owner_update"
  on public.user_block_history
  for update to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- Perfiles bloqueados dejan de ser legibles para la sesión afectada, pero el
-- propio perfil siempre sigue disponible.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (
    auth.uid() = id
    or not public.users_are_blocked(auth.uid(), id)
  );

-- Las lecturas directas respetan el bloqueo. La vista de comunidad también se
-- filtra más abajo porque corre con privilegios del owner de la vista.
drop policy if exists "community_posts_select_authenticated" on public.community_posts;
create policy "community_posts_select_authenticated" on public.community_posts
  for select to authenticated
  using (not public.users_are_blocked(auth.uid(), user_id));

drop policy if exists "post_reactions_select_authenticated" on public.post_reactions;
create policy "post_reactions_select_authenticated" on public.post_reactions
  for select to authenticated
  using (not public.users_are_blocked(auth.uid(), user_id));

-- Un solo criterio para leer comentarios: ni ocultos por moderación (0024) ni de
-- usuarios bloqueados. El orden de las migraciones garantiza que hidden_at ya
-- existe, así que no hace falta el guard condicional que traía el branch viejo.
drop policy if exists "post_comments_select_authenticated" on public.post_comments;
create policy "post_comments_select_authenticated" on public.post_comments
  for select to authenticated
  using (hidden_at is null and not public.users_are_blocked(auth.uid(), user_id));

drop policy if exists "post_votes_select_authenticated" on public.post_votes;
create policy "post_votes_select_authenticated" on public.post_votes
  for select to authenticated
  using (not public.users_are_blocked(auth.uid(), user_id));

drop policy if exists "follows_select_authenticated" on public.follows;
create policy "follows_select_authenticated" on public.follows
  for select to authenticated
  using (
    not public.users_are_blocked(auth.uid(), follower_id)
    and not public.users_are_blocked(auth.uid(), following_id)
  );

-- Writes must be protected server-side even if a stale client keeps a button.
drop policy if exists "follows_owner_insert" on public.follows;
create policy "follows_owner_insert" on public.follows
  for insert to authenticated
  with check (
    auth.uid() = follower_id
    and not public.users_are_blocked(auth.uid(), following_id)
  );

drop policy if exists "post_reactions_owner_insert" on public.post_reactions;
create policy "post_reactions_owner_insert" on public.post_reactions
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.community_posts cp
      where cp.id = post_id
        and public.users_are_blocked(auth.uid(), cp.user_id)
    )
  );

drop policy if exists "post_reactions_owner_update" on public.post_reactions;
create policy "post_reactions_owner_update" on public.post_reactions
  for update to authenticated
  using (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.community_posts cp
      where cp.id = post_id
        and public.users_are_blocked(auth.uid(), cp.user_id)
    )
  );

drop policy if exists "post_comments_owner_insert" on public.post_comments;
create policy "post_comments_owner_insert" on public.post_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.community_posts cp
      where cp.id = post_id
        and public.users_are_blocked(auth.uid(), cp.user_id)
    )
  );

drop policy if exists "post_votes_owner_insert" on public.post_votes;
create policy "post_votes_owner_insert" on public.post_votes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.community_posts cp
      where cp.id = post_id
        and public.users_are_blocked(auth.uid(), cp.user_id)
    )
  );

drop policy if exists "post_votes_owner_update" on public.post_votes;
create policy "post_votes_owner_update" on public.post_votes
  for update to authenticated
  using (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.community_posts cp
      where cp.id = post_id
        and public.users_are_blocked(auth.uid(), cp.user_id)
    )
  );

-- Community reads and all aggregated counters hide the blocked relationship for
-- the current authenticated viewer. auth.uid() is null for the admin client or
-- an anonymous request, preserving the existing public/admin behavior.
-- Se conserva el contrato completo de la vista rebasada: comentarios ocultos
-- fuera del conteo (0024) y author_is_seed al final (0023_seed_flag).
create or replace view public.community_feed_view as
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
  (select count(*) from public.post_reactions r
    where r.post_id = cp.id
      and r.reaction = 'like'
      and not public.users_are_blocked(auth.uid(), r.user_id)) as like_count,
  (select count(*) from public.post_reactions r
    where r.post_id = cp.id
      and r.reaction = 'dislike'
      and not public.users_are_blocked(auth.uid(), r.user_id)) as dislike_count,
  (select count(*) from public.post_comments c
    where c.post_id = cp.id
      and c.hidden_at is null
      and not public.users_are_blocked(auth.uid(), c.user_id)) as comment_count,
  p.gender as author_gender,
  (select count(*) from public.post_votes v
    where v.post_id = cp.id and v.bucket = 'mejorar'
      and not public.users_are_blocked(auth.uid(), v.user_id)) as votes_mejorar,
  (select count(*) from public.post_votes v
    where v.post_id = cp.id and v.bucket = 'bien'
      and not public.users_are_blocked(auth.uid(), v.user_id)) as votes_bien,
  (select count(*) from public.post_votes v
    where v.post_id = cp.id and v.bucket = 'muy_bueno'
      and not public.users_are_blocked(auth.uid(), v.user_id)) as votes_muy_bueno,
  (select count(*) from public.post_votes v
    where v.post_id = cp.id and v.bucket = 'impecable'
      and not public.users_are_blocked(auth.uid(), v.user_id)) as votes_impecable,
  p.is_seed as author_is_seed
from public.community_posts cp
join public.profiles p on p.id = cp.user_id
join public.analyses a on a.id = cp.analysis_id
where not public.users_are_blocked(auth.uid(), p.id);

alter view public.community_feed_view set (security_invoker = false);
grant select on public.community_feed_view to authenticated;

-- La actividad no debe contar eventos generados por personas bloqueadas.
-- Se parte de la versión de main (reactions + comments + votos, ver
-- 0022_activity_votes) y se le suma el filtro de bloqueo. NOTA: no se cuentan
-- follows a propósito, para no cambiar la semántica del badge de main en este
-- PR; si se quiere sumar follows va en un cambio aparte.
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
    (select count(*)
     from public.post_reactions r
     join public.community_posts cp on cp.id = r.post_id
     where cp.user_id = (select id from me)
       and r.user_id <> cp.user_id
       and r.reaction = 'like'
       and r.created_at > (select last_seen_activity_at from me)
       and not public.users_are_blocked(auth.uid(), r.user_id))
    +
    (select count(*)
     from public.post_comments c
     join public.community_posts cp on cp.id = c.post_id
     where cp.user_id = (select id from me)
       and c.user_id <> cp.user_id
       and c.created_at > (select last_seen_activity_at from me)
       and not public.users_are_blocked(auth.uid(), c.user_id))
    +
    (select count(distinct v.post_id)
     from public.post_votes v
     join public.community_posts cp on cp.id = v.post_id
     where cp.user_id = (select id from me)
       and v.user_id <> cp.user_id
       and v.created_at > (select last_seen_activity_at from me)
       and not public.users_are_blocked(auth.uid(), v.user_id))
  )::int;
$$;

-- Storage policies must not allow a blocked viewer to sign a published photo by
-- path. Admin/anonymous callers keep the existing behavior because auth.uid()
-- is null for those clients.
create or replace function public.is_community_photo(p_photo_path text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.community_posts cp
    join public.analyses a on a.id = cp.analysis_id
    where a.photo_path = p_photo_path
      and not public.users_are_blocked(auth.uid(), cp.user_id)
  );
$$;

-- Aggregated admin metrics. This function intentionally returns no user names
-- or raw block history to the browser.
create or replace function public.admin_block_metrics()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'active_blocks', (select count(*) from public.user_block_history where unblocked_at is null),
    'blocks_last_7_days', (select count(*) from public.user_block_history where blocked_at >= now() - interval '7 days'),
    'blocks_last_30_days', (select count(*) from public.user_block_history where blocked_at >= now() - interval '30 days'),
    'unblocks_last_7_days', (select count(*) from public.user_block_history where unblocked_at >= now() - interval '7 days'),
    'unblocks_last_30_days', (select count(*) from public.user_block_history where unblocked_at >= now() - interval '30 days'),
    'unique_blockers', (select count(distinct blocker_id) from public.user_block_history),
    'unique_currently_blocked_users', (select count(distinct blocked_id) from public.user_block_history where unblocked_at is null),
    'unique_historically_blocked_users', (select count(distinct blocked_id) from public.user_block_history),
    'average_blocks_per_blocker', (
      select coalesce(round(count(*)::numeric / nullif(count(distinct blocker_id), 0), 2), 0)
      from public.user_block_history
    ),
    'blocks_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'count', count) order by day), '[]'::jsonb)
      from (
        select gs::date as day,
               (select count(*) from public.user_block_history h
                where h.blocked_at >= gs
                  and h.blocked_at < gs + interval '1 day') as count
        from generate_series(current_date - interval '13 days', current_date, interval '1 day') gs
      ) daily
    )
  );
$$;

revoke all on function public.admin_block_metrics() from public;
revoke all on function public.admin_block_metrics() from anon;
revoke all on function public.admin_block_metrics() from authenticated;
grant execute on function public.admin_block_metrics() to service_role;
