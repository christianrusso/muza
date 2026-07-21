-- ============================================================================
-- Colorimetría: una por usuario
-- ============================================================================
-- A diferencia de los análisis de outfit (muchos por usuario), la colorimetría
-- es UNA por persona: describe tu coloración natural (piel, pelo, ojos), que no
-- cambia entre fotos. Por eso unique(user_id): regenerarla reemplaza la anterior
-- (upsert), no acumula.
--
-- El resultado completo (temporada, paleta, recomendaciones) se guarda como jsonb
-- con la forma del tipo Colorimetry (src/types/colorimetry.ts). Se guarda entero
-- porque se genera y se muestra como una unidad; no se consulta por campo.
-- ============================================================================

create table public.colorimetries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  -- Foto de origen (bucket privado). Sirve para mostrarla y para regenerar.
  photo_path text not null,
  -- El objeto Colorimetry completo (temporada, subtono, paleta, outfitGroups…).
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.colorimetries enable row level security;

-- Dato personal: cada quien ve y escribe SOLO la suya.
create policy "colorimetries_select_own" on public.colorimetries
  for select to authenticated using (auth.uid() = user_id);
create policy "colorimetries_insert_own" on public.colorimetries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "colorimetries_update_own" on public.colorimetries
  for update to authenticated using (auth.uid() = user_id);
create policy "colorimetries_delete_own" on public.colorimetries
  for delete to authenticated using (auth.uid() = user_id);
