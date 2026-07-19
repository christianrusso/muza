-- Marca de cuenta semilla, para que el contenido real gane al sintético.
--
-- El problema que resuelve: scripts/seed-migrate.ts crea ~50 cuentas con nombres
-- creíbles y les reparte cientos de posts. Contra eso, los usuarios reales
-- publicaron 9. El mazo de "Votá" abre una ventana al azar sobre TODO el corpus
-- (ver loadVoteQueue), así que un post real aparece con probabilidad ~9/N: los
-- votos de la gente real terminan casi todos en cuentas que no existen y nadie
-- recibe devolución. El loop social no está roto — nunca se enchufó.
--
-- La marca ya existe en auth.users.raw_user_meta_data (`seed: true`, puesto por
-- el script), pero ahí no la puede leer la vista del feed. La bajamos a profiles
-- para poder ordenar por ella.

begin;

alter table public.profiles
  add column if not exists is_seed boolean not null default false;

-- Backfill de las cuentas ya creadas por el script.
update public.profiles p
   set is_seed = true
  from auth.users u
 where u.id = p.id
   and (u.raw_user_meta_data ->> 'seed')::boolean is true;

-- Las corridas futuras del seed quedan marcadas solas: el trigger lee la misma
-- metadata que ya escribe el script. Un usuario real nunca trae ese campo, así
-- que el default en false lo cubre.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, is_seed)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    coalesce((new.raw_user_meta_data ->> 'seed')::boolean, false)
  );
  return new;
end;
$$;

-- La vista suma author_is_seed. Se agrega una columna al final, pero igual hay
-- que dropear y recrear: `create or replace view` no admite cambios de columnas
-- en la lista. No hay objetos de base dependientes — solo la consulta la app.
drop view if exists public.community_feed_view;

create view public.community_feed_view as
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
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'mejorar') as votes_mejorar,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'bien') as votes_bien,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'muy_bueno') as votes_muy_bueno,
  (select count(*) from public.post_votes v where v.post_id = cp.id and v.bucket = 'impecable') as votes_impecable,
  p.is_seed as author_is_seed
from public.community_posts cp
join public.profiles p on p.id = cp.user_id
join public.analyses a on a.id = cp.analysis_id;

-- Mismo criterio que 0005/0017/0021: corre con privilegios del owner para que
-- cualquier autenticado vea los posts publicados sin relajar el RLS de analyses.
alter view public.community_feed_view set (security_invoker = false);

grant select on public.community_feed_view to authenticated;

-- El mazo pide los posts reales por separado y filtra por esta columna.
create index if not exists profiles_is_seed_idx on public.profiles (is_seed) where is_seed = false;

commit;
