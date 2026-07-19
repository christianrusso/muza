-- Muza — actividad: novedades de likes/comentarios en tus posts
--
-- Marca de "visto por última vez" para calcular el badge de novedades. Default
-- now() para que los usuarios existentes NO arrastren un backlog retroactivo:
-- solo cuenta como no leída la actividad posterior a esta migración.
alter table public.profiles
  add column last_seen_activity_at timestamptz not null default now();

-- Contador de novedades para el badge de la tab bar. security invoker: corre con
-- los privilegios del que llama, apoyándose en el RLS de lectura abierta de
-- post_reactions/post_comments/community_posts (ver 0003). Suma likes + comentarios
-- de OTROS usuarios sobre los posts del usuario actual, posteriores a su
-- last_seen_activity_at. Un solo round-trip (importa por la latencia edge→Supabase).
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
  )::int;
$$;
