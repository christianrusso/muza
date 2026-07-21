-- ============================================================================
-- Bucket de fotos de colorimetría
-- ============================================================================
-- Igual que outfit-photos (ver 0004): privado, path "{user_id}/{uuid}.jpg", el
-- dueño sube/lee lo suyo y la lectura real va por signed URL desde el server.
-- Separado de outfit-photos porque son fotos de cara (más sensibles) y con otro
-- ciclo de vida (una vigente por usuario).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('colorimetry-photos', 'colorimetry-photos', false)
on conflict (id) do nothing;

create policy "colorimetry_photos_owner_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'colorimetry-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'colorimetry-photos' and (storage.foldername(name))[1] = auth.uid()::text);
