-- El panel /admin ya mostraba "Votos" = votos EMITIDOS por el usuario
-- (post_votes.user_id). Faltaba el reverso: cuántos votos RECIBIERON sus posts.
--
-- Se agrega votes_received a las dos funciones que alimentan el tipo AdminUser
-- (lista y ficha), calculado igual en ambas: post_votes contra los community_posts
-- del usuario. Mantenerlas simétricas evita que un campo exista en una y no en la
-- otra y explote al leerlo en runtime (las RPC van casteadas, TS no lo ve).

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
      (select count(*) from public.post_votes v
         join public.community_posts cp on cp.id = v.post_id
        where cp.user_id = p.id) as votes_received,
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

create or replace function public.admin_user_detail(
  p_user_id uuid,
  p_limit int default 60
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'user', (
      select to_jsonb(t) from (
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
          (select count(*) from public.post_votes v
             join public.community_posts cp on cp.id = v.post_id
            where cp.user_id = p.id) as votes_received,
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
        where p.id = p_user_id
      ) t
    ),

    'analyses', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
      from (
        select
          a.id,
          a.photo_path,
          a.analysis_type,
          a.validity_status,
          a.overall_score,
          a.created_at,
          coalesce(o.label_es, a.occasion_id) as occasion,
          cp.id as post_id,
          cp.caption,
          (select count(*) from public.post_reactions r
            where r.post_id = cp.id and r.reaction = 'like') as post_likes
        from public.analyses a
        left join public.occasions o on o.id = a.occasion_id
        left join public.community_posts cp on cp.analysis_id = a.id
        where a.user_id = p_user_id
        order by a.created_at desc
        limit p_limit
      ) t
    )
  );
$$;

revoke all on function public.admin_user_detail(uuid, int) from public;
revoke all on function public.admin_user_detail(uuid, int) from anon;
revoke all on function public.admin_user_detail(uuid, int) from authenticated;
grant execute on function public.admin_user_detail(uuid, int) to service_role;
