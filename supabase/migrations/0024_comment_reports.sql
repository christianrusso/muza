-- Reportes de comentarios y moderación (Feature 1).
-- (Renumerado 0022 -> 0024 al rebasar sobre main: 0022_activity_votes y
--  0023_seed_flag ya ocupaban esos números.)
create table public.comment_report_categories (
  id uuid primary key,
  slug text not null unique,
  label text not null,
  sort_order integer not null,
  is_active boolean not null default true
);

insert into public.comment_report_categories (id, slug, label, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'harassment_bullying', 'Acoso o bullying', 1),
  ('00000000-0000-4000-8000-000000000002', 'hate_discrimination', 'Discurso de odio o discriminación', 2),
  ('00000000-0000-4000-8000-000000000003', 'threats_violence', 'Amenazas o violencia', 3),
  ('00000000-0000-4000-8000-000000000004', 'sexual_inappropriate', 'Contenido sexual o inapropiado', 4),
  ('00000000-0000-4000-8000-000000000005', 'spam_advertising', 'Spam o publicidad', 5),
  ('00000000-0000-4000-8000-000000000006', 'personal_information', 'Información personal', 6),
  ('00000000-0000-4000-8000-000000000007', 'other', 'Otro', 7)
on conflict (id) do nothing;

alter table public.post_comments add column if not exists hidden_at timestamptz;
alter table public.post_comments add column if not exists hidden_by text;

create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references public.post_comments(id) on delete set null,
  reporter_id uuid references public.profiles(id) on delete set null,
  category_id uuid not null references public.comment_report_categories(id),
  observations text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  comment_body_snapshot text not null,
  comment_author_id_snapshot uuid not null,
  comment_author_name_snapshot text not null,
  reporter_name_snapshot text not null,
  post_id_snapshot uuid not null,
  post_caption_snapshot text,
  comment_created_at_snapshot timestamptz not null,
  admin_notes text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index comment_reports_reporter_comment_uidx
  on public.comment_reports (reporter_id, comment_id)
  where comment_id is not null;
create index comment_reports_status_created_idx on public.comment_reports (status, created_at desc);

alter table public.comment_report_categories enable row level security;
alter table public.comment_reports enable row level security;
drop policy if exists "post_comments_select_authenticated" on public.post_comments;
create policy "post_comments_select_authenticated" on public.post_comments
  for select to authenticated using (hidden_at is null);
create policy "comment_report_categories_select_authenticated" on public.comment_report_categories
  for select to authenticated using (is_active);

create or replace function public.create_comment_report(
  p_comment_id uuid, p_category_id uuid, p_observations text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_comment record; v_category record; v_report record; v_name text;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if public.is_blocked(v_user) then raise exception 'UNAUTHENTICATED'; end if;
  select c.id, c.body, c.user_id, c.post_id, c.created_at, c.hidden_at,
         p.full_name as author_name, cp.caption
    into v_comment
    from post_comments c join profiles p on p.id = c.user_id
    join community_posts cp on cp.id = c.post_id
   where c.id = p_comment_id;
  if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
  if v_comment.hidden_at is not null then raise exception 'COMMENT_NOT_FOUND'; end if;
  if v_comment.user_id = v_user then raise exception 'OWN_COMMENT'; end if;
  select * into v_category from comment_report_categories where id = p_category_id and is_active;
  if not found then raise exception 'INVALID_CATEGORY'; end if;
  if v_category.slug = 'other' and nullif(btrim(p_observations), '') is null then raise exception 'OBSERVATIONS_REQUIRED'; end if;
  if length(btrim(coalesce(p_observations, ''))) > 1000 then raise exception 'OBSERVATIONS_TOO_LONG'; end if;
  if exists (select 1 from comment_reports where reporter_id = v_user and comment_id = p_comment_id) then raise exception 'DUPLICATE_REPORT'; end if;
  select full_name into v_name from profiles where id = v_user;
  -- El exists() de arriba es el camino rápido/amable, pero no es atómico: dos
  -- requests concurrentes podrían pasarlo a la vez. El índice único parcial
  -- (comment_reports_reporter_comment_uidx) es la garantía real; acá mapeamos su
  -- violación al mismo error de dominio en vez de dejar salir un 500 crudo.
  begin
    insert into comment_reports (comment_id, reporter_id, category_id, observations, comment_body_snapshot,
      comment_author_id_snapshot, comment_author_name_snapshot, reporter_name_snapshot, post_id_snapshot,
      post_caption_snapshot, comment_created_at_snapshot)
    values (p_comment_id, v_user, p_category_id, nullif(btrim(p_observations), ''), v_comment.body,
      v_comment.user_id, v_comment.author_name, coalesce(v_name, 'Usuario'), v_comment.post_id,
      v_comment.caption, v_comment.created_at)
    returning id, status, created_at into v_report;
  exception when unique_violation then
    raise exception 'DUPLICATE_REPORT';
  end;
  return jsonb_build_object('id', v_report.id, 'status', v_report.status, 'createdAt', v_report.created_at);
end; $$;
revoke all on function public.create_comment_report(uuid, uuid, text) from public;
grant execute on function public.create_comment_report(uuid, uuid, text) to authenticated;

create or replace function public.resolve_comment_report(
  p_report_id uuid, p_status text, p_admin_actor text, p_admin_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_report comment_reports%rowtype; v_now timestamptz := now();
begin
  if p_status not in ('confirmed', 'dismissed') then raise exception 'INVALID_STATUS'; end if;
  if length(btrim(coalesce(p_admin_notes, ''))) > 2000 then raise exception 'ADMIN_NOTES_TOO_LONG'; end if;
  update comment_reports set status = p_status, admin_notes = nullif(btrim(p_admin_notes), ''),
    resolved_by = p_admin_actor, resolved_at = v_now
   where id = p_report_id and status = 'pending' returning * into v_report;
  if not found then
    if exists (select 1 from comment_reports where id = p_report_id) then raise exception 'REPORT_ALREADY_RESOLVED'; end if;
    raise exception 'REPORT_NOT_FOUND';
  end if;
  if p_status = 'confirmed' then
    update post_comments set hidden_at = v_now, hidden_by = p_admin_actor where id = v_report.comment_id and hidden_at is null;
    update comment_reports set status = 'confirmed', resolved_by = p_admin_actor, resolved_at = v_now
      where comment_id = v_report.comment_id and status = 'pending';
  end if;
  return jsonb_build_object('id', v_report.id, 'status', p_status, 'resolvedAt', v_now);
end; $$;
revoke all on function public.resolve_comment_report(uuid, text, text, text) from public;
grant execute on function public.resolve_comment_report(uuid, text, text, text) to service_role;

-- La vista mantiene su contrato (columnas de 0021 + author_is_seed de 0023) y
-- solo suma la regla nueva: los comentarios ocultos no participan del conteo.
drop view if exists public.community_feed_view;
create view public.community_feed_view as
select cp.id as post_id, cp.caption, cp.created_at as posted_at,
  p.id as author_id, p.full_name as author_name, p.avatar_url as author_avatar_url,
  a.id as analysis_id, a.photo_path, a.occasion_id, a.analysis_type, a.overall_score,
  a.style_descriptors,
  (select count(*) from post_reactions r where r.post_id = cp.id and r.reaction = 'like') as like_count,
  (select count(*) from post_reactions r where r.post_id = cp.id and r.reaction = 'dislike') as dislike_count,
  (select count(*) from post_comments c where c.post_id = cp.id and c.hidden_at is null) as comment_count,
  p.gender as author_gender,
  (select count(*) from post_votes v where v.post_id = cp.id and v.bucket = 'mejorar') as votes_mejorar,
  (select count(*) from post_votes v where v.post_id = cp.id and v.bucket = 'bien') as votes_bien,
  (select count(*) from post_votes v where v.post_id = cp.id and v.bucket = 'muy_bueno') as votes_muy_bueno,
  (select count(*) from post_votes v where v.post_id = cp.id and v.bucket = 'impecable') as votes_impecable,
  p.is_seed as author_is_seed
from community_posts cp join profiles p on p.id = cp.user_id join analyses a on a.id = cp.analysis_id;
alter view public.community_feed_view set (security_invoker = false);
grant select on public.community_feed_view to authenticated;
