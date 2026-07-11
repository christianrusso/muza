-- Muza — votación "adiviná el score" + follows en actividad
--
-- El modo "Votá" muestra un look con el score de la IA oculto; el usuario adivina
-- en qué franja cae (bajo/medio/alto) y recién ahí se revela el score real + el
-- consenso de la comunidad. Cada usuario vota una vez por post.

create table public.post_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  bucket text not null check (bucket in ('low', 'mid', 'high')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index post_votes_post_id_idx on public.post_votes (post_id);
create index post_votes_user_id_idx on public.post_votes (user_id);

alter table public.post_votes enable row level security;

-- post_votes: open read (para agregar el consenso de la comunidad); insert/update/
-- delete restringido a las filas propias.
create policy "post_votes_select_authenticated" on public.post_votes
  for select to authenticated using (true);
create policy "post_votes_owner_insert" on public.post_votes
  for insert to authenticated with check (auth.uid() = user_id);
create policy "post_votes_owner_update" on public.post_votes
  for update to authenticated using (auth.uid() = user_id);
create policy "post_votes_owner_delete" on public.post_votes
  for delete to authenticated using (auth.uid() = user_id);

-- Recreamos community_feed_view sumando:
--   * los conteos de votos por franja (para el consenso de la comunidad), y
--   * el género del autor (señal de relevancia para ordenar la cola de "Votá").
-- Mantiene security_invoker = false (ver 0005): corre con privilegios del owner
-- para que cualquier autenticado vea los posts publicados sin relajar el RLS de
-- analyses.
-- OJO: `create or replace view` solo permite AGREGAR columnas al final, no
-- insertarlas en el medio (renombraría las posiciones existentes). Por eso las 15
-- columnas originales van primero, en su orden, y las 4 nuevas (author_gender +
-- conteos de votos) al final.
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
  (select count(*) from public.post_reactions r where r.post_id = cp.id and r.reaction = 'like') as like_count,
  (select count(*) from public.post_reactions r where r.post_id = cp.id and r.reaction = 'dislike') as dislike_count,
  (select count(*) from public.post_comments c where c.post_id = cp.id) as comment_count,
  p.gender as author_gender,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'low') as low_votes,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'mid') as mid_votes,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'high') as high_votes
from public.community_posts cp
join public.profiles p on p.id = cp.user_id
join public.analyses a on a.id = cp.analysis_id;

alter view public.community_feed_view set (security_invoker = false);

-- El badge de novedades ahora también cuenta los seguidores nuevos ("empezó a
-- seguirte"), además de likes y comentarios. security invoker: se apoya en el RLS
-- de lectura abierta de follows/post_reactions/post_comments (ver 0003).
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
    (
      select count(*)
      from public.follows f
      where f.following_id = (select id from me)
        and f.created_at > (select last_seen_activity_at from me)
    )
  )::int;
$$;
