-- Métricas del panel /admin. Una sola función que agrega todo en Postgres y
-- devuelve un jsonb, para no traer filas al cliente ni chocar con el tope de
-- 1000 filas de PostgREST. Solo la ejecuta el service_role (el panel usa la
-- service-role key desde el server); se le revoca a anon/authenticated para
-- que no quede expuesta por la API pública.

create or replace function public.admin_metrics()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'generated_at', now(),

    'users', (
      select jsonb_build_object(
        'total', count(*),
        'pro', count(*) filter (where plan_tier = 'pro'),
        'free', count(*) filter (where plan_tier = 'free'),
        'new_7d', count(*) filter (where created_at >= now() - interval '7 days'),
        'new_30d', count(*) filter (where created_at >= now() - interval '30 days')
      )
      from public.profiles
    ),

    'signups_by_day', (
      select coalesce(
        jsonb_agg(jsonb_build_object('day', day, 'count', c) order by day),
        '[]'::jsonb
      )
      from (
        select date_trunc('day', created_at)::date as day, count(*) as c
        from public.profiles
        where created_at >= current_date - interval '13 days'
        group by 1
      ) t
    ),

    'analyses', (
      select jsonb_build_object(
        'total', count(*),
        'valid', count(*) filter (where validity_status = 'valid'),
        'invalid', count(*) filter (where validity_status = 'invalid'),
        'pending', count(*) filter (where validity_status = 'pending'),
        'distinct_users', count(distinct user_id),
        'avg_score', coalesce(round(avg(overall_score) filter (where overall_score is not null))::int, 0)
      )
      from public.analyses
    ),

    'analyses_by_day', (
      select coalesce(
        jsonb_agg(jsonb_build_object('day', day, 'count', c) order by day),
        '[]'::jsonb
      )
      from (
        select date_trunc('day', created_at)::date as day, count(*) as c
        from public.analyses
        where created_at >= current_date - interval '13 days'
        group by 1
      ) t
    ),

    'by_occasion', (
      select coalesce(
        jsonb_agg(jsonb_build_object('occasion', occasion, 'count', c) order by c desc),
        '[]'::jsonb
      )
      from (
        select coalesce(o.label_es, a.occasion_id) as occasion, count(*) as c
        from public.analyses a
        left join public.occasions o on o.id = a.occasion_id
        group by 1
      ) t
    ),

    'top_users', (
      select coalesce(
        jsonb_agg(jsonb_build_object('name', name, 'count', c) order by c desc),
        '[]'::jsonb
      )
      from (
        select p.full_name as name, count(*) as c
        from public.analyses a
        join public.profiles p on p.id = a.user_id
        group by p.id, p.full_name
        order by c desc
        limit 10
      ) t
    ),

    'community', (
      select jsonb_build_object(
        'posts', (select count(*) from public.community_posts),
        'reactions', (select count(*) from public.post_reactions),
        'comments', (select count(*) from public.post_comments),
        'follows', (select count(*) from public.follows),
        'distinct_posters', (select count(distinct user_id) from public.community_posts)
      )
    ),

    'top_posts', (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'name', name,
          'caption', caption,
          'likes', likes,
          'created_at', created_at
        ) order by likes desc, created_at desc),
        '[]'::jsonb
      )
      from (
        select p.full_name as name, cp.caption, cp.created_at,
               count(pr.id) filter (where pr.reaction = 'like') as likes
        from public.community_posts cp
        join public.profiles p on p.id = cp.user_id
        left join public.post_reactions pr on pr.post_id = cp.id
        group by cp.id, p.full_name, cp.caption, cp.created_at
        order by likes desc, cp.created_at desc
        limit 5
      ) t
    )
  );
$$;

revoke all on function public.admin_metrics() from public;
revoke all on function public.admin_metrics() from anon;
revoke all on function public.admin_metrics() from authenticated;
grant execute on function public.admin_metrics() to service_role;
