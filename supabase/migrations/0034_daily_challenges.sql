-- ============================================================================
-- Reto del día: "¿A cuál le dio mejor score la IA?"
-- ============================================================================
-- Un reto GLOBAL por día (modelo Wordle): 3 looks reales de la comunidad, de la
-- MISMA ocasión, con separación de score clara. El usuario adivina a cuál le puso
-- mejor puntaje la IA. Como es global, todos ven el mismo trío y se puede comparar
-- rachas. El trío se genera on-demand la primera vez que alguien abre el reto en
-- el día (server-side, service-role), y queda cacheado acá para el resto.
--
-- No guardamos scores acá: el "correcto" es winner_post_id y los scores se leen de
-- community_feed_view al revelar (contenido público). look_ids está en ORDEN DE
-- MUESTRA (barajado) para no filtrar el ganador por posición.
-- ============================================================================

create table public.daily_challenges (
  challenge_date date primary key,
  occasion_id text not null,
  -- 3 posts de comunidad en orden de muestra (barajado). El ganador NO va primero.
  look_ids uuid[] not null,
  -- El post con mayor score de la IA para esa ocasión: la respuesta correcta.
  winner_post_id uuid not null,
  created_at timestamptz not null default now(),
  constraint daily_challenges_three_looks check (array_length(look_ids, 1) = 3)
);

alter table public.daily_challenges enable row level security;

-- Lectura pública: el reto se arma con contenido de comunidad que ya es público,
-- y el invitado tiene que poder jugarlo (es el gancho de adquisición). La escritura
-- la hace SOLO el server con service-role (bypassa RLS): no hay policy de insert.
create policy "daily_challenges_select_all" on public.daily_challenges
  for select to anon, authenticated using (true);

create table public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_date date not null references public.daily_challenges (challenge_date) on delete cascade,
  picked_post_id uuid not null,
  correct boolean not null,
  created_at timestamptz not null default now(),
  -- Un intento por usuario por día: no se puede cambiar la respuesta.
  unique (user_id, challenge_date)
);

alter table public.challenge_attempts enable row level security;

-- Índice para el cálculo de racha (fechas del usuario, más nuevas primero).
create index challenge_attempts_user_date_idx
  on public.challenge_attempts (user_id, challenge_date desc);

-- Cada quien ve y escribe SOLO sus intentos. Sin update: la respuesta es final.
create policy "challenge_attempts_select_own" on public.challenge_attempts
  for select to authenticated using (auth.uid() = user_id);
create policy "challenge_attempts_insert_own" on public.challenge_attempts
  for insert to authenticated with check (auth.uid() = user_id);
