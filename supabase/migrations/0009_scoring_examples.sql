-- Muza — Banco de ejemplos few-shot para el scoring.
-- Outfits curados con veredicto humano por ocasión. Se inyectan como referencia
-- en la llamada de scoring para calibrar el criterio (ej. "una remera de fútbol
-- NO va para un casamiento"). Es la versión de producción del labels.json del eval.

create table public.scoring_examples (
  id uuid primary key default gen_random_uuid(),
  -- ruta del bucket de storage donde vive la imagen de referencia
  photo_path text not null,
  occasion_id text not null references public.occasions (id),
  verdict text not null check (verdict in ('good', 'bad')),
  note text,
  -- permite desactivar un ejemplo sin borrarlo
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Búsqueda típica: ejemplos activos de una ocasión.
create index scoring_examples_occasion_idx
  on public.scoring_examples (occasion_id)
  where active;

alter table public.scoring_examples enable row level security;

-- Data de referencia curada (no pertenece a un usuario): lectura para autenticados.
-- La escritura queda solo para el service role / panel de admin (sin policy de write).
create policy "scoring_examples_read" on public.scoring_examples
  for select
  using (auth.role() = 'authenticated');
