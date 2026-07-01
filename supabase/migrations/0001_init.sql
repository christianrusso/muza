-- Muza MVP — core schema
-- profiles, occasions, analyses, analysis_categories, analysis_feedback, plan_usage

create extension if not exists "pgcrypto";

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  notifications_enabled boolean not null default true,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'pro')),
  plan_started_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===== occasions (seeded lookup, drives the 3x3 grid) =====
create table public.occasions (
  id text primary key,
  label_es text not null,
  icon_name text not null,
  sort_order int not null
);

insert into public.occasions (id, label_es, icon_name, sort_order) values
  ('casual', 'Casual', 'checkroom', 1),
  ('work', 'Trabajo', 'work', 2),
  ('gym', 'Gimnasio', 'fitness_center', 3),
  ('party', 'Fiesta', 'local_bar', 4),
  ('wedding', 'Casamiento', 'diamond', 5),
  ('date', 'Cita', 'favorite', 6),
  ('interview', 'Entrevista', 'handshake', 7),
  ('travel', 'Viaje', 'flight', 8),
  ('other', 'Otro', 'more_horiz', 9);

-- ===== analyses =====
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  occasion_id text not null references public.occasions (id),
  photo_path text not null,
  analysis_type text check (analysis_type in ('completo', 'superior', 'inferior', 'individual')),
  validity_status text not null default 'pending'
    check (validity_status in ('pending', 'valid', 'partial', 'invalid')),
  overall_score int check (overall_score between 0 and 100),
  qualitative_badge text,
  style_descriptors text[] not null default '{}',
  detected_prendas_superiores text[] not null default '{}',
  detected_prendas_inferiores text[] not null default '{}',
  detected_calzado text[] not null default '{}',
  detected_accesorios text[] not null default '{}',
  detected_colores text[] not null default '{}',
  detected_estilo text,
  ai_raw_response jsonb,
  created_at timestamptz not null default now()
);

create index analyses_user_id_created_at_idx on public.analyses (user_id, created_at desc);
create index analyses_user_id_type_idx on public.analyses (user_id, analysis_type);

-- ===== analysis_categories (10 normalized rows per analysis) =====
create table public.analysis_categories (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  category_key text not null check (category_key in (
    'ocasion', 'fit', 'colores', 'coherencia', 'calzado',
    'proporciones', 'accesorios', 'estado_prendas', 'modernidad', 'originalidad'
  )),
  weight numeric not null check (weight > 0 and weight <= 1),
  score int not null check (score between 0 and 100),
  justification text,
  unique (analysis_id, category_key)
);

-- ===== analysis_feedback (Fortalezas / Aspectos a mejorar / Recomendaciones) =====
create table public.analysis_feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  kind text not null check (kind in ('fortaleza', 'aspecto_mejorar', 'recomendacion')),
  text text not null,
  sort_order int not null default 0
);

create index analysis_feedback_analysis_id_idx on public.analysis_feedback (analysis_id);

-- ===== plan_usage (monthly analysis counter per user, enforced server-side) =====
create table public.plan_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_month date not null,
  analyses_count int not null default 0,
  primary key (user_id, period_month)
);

create function public.increment_analysis_usage(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_period date := date_trunc('month', now())::date;
begin
  insert into public.plan_usage (user_id, period_month, analyses_count)
  values (p_user_id, v_period, 1)
  on conflict (user_id, period_month)
  do update set analyses_count = public.plan_usage.analyses_count + 1;
end;
$$;
