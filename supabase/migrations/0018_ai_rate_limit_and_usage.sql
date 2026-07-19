-- Rate limiting + registro de gasto de IA + corte por tope (Sprint 1, roadmap 2.2).
-- Protección técnica contra abuso/bugs que disparen llamadas ilimitadas a OpenAI.
-- Todo se accede solo con el service role (RLS sin políticas): es infra interna.

-- ============================================================================
-- Rate limit: un hit por creación de análisis, por key (user:<id> o ip:<ip>).
-- ============================================================================
create table if not exists public.ai_rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_rate_limit_hits_key_created_idx
  on public.ai_rate_limit_hits (key, created_at);

alter table public.ai_rate_limit_hits enable row level security;

-- Ventana deslizante: chequea minuto y hora para una key y registra el hit si
-- pasa. Devuelve true = permitido, false = superó algún límite. Auto-limpia los
-- hits de más de 1h de esa key en cada llamada (no crece indefinidamente).
create or replace function public.check_rate_limit(
  p_key text,
  p_per_minute int,
  p_per_hour int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  minute_cnt int;
  hour_cnt int;
begin
  delete from public.ai_rate_limit_hits
    where key = p_key and created_at < now() - interval '1 hour';
  select count(*) into hour_cnt from public.ai_rate_limit_hits where key = p_key;
  select count(*) into minute_cnt from public.ai_rate_limit_hits
    where key = p_key and created_at > now() - interval '1 minute';
  if minute_cnt >= p_per_minute or hour_cnt >= p_per_hour then
    return false;
  end if;
  insert into public.ai_rate_limit_hits (key) values (p_key);
  return true;
end;
$$;

-- ============================================================================
-- Registro de gasto: una fila por llamada a OpenAI (validate | score).
-- ============================================================================
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  endpoint text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_log_created_idx on public.ai_usage_log (created_at);

alter table public.ai_usage_log enable row level security;

-- Gasto del día y del mes (UTC) en una sola llamada, para el circuit breaker.
create or replace function public.ai_spend_summary()
returns table(day_spend numeric, month_spend numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(estimated_cost_usd) filter (where created_at >= date_trunc('day', now())), 0)::numeric,
    coalesce(sum(estimated_cost_usd) filter (where created_at >= date_trunc('month', now())), 0)::numeric
  from public.ai_usage_log;
$$;
