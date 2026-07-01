-- Muza MVP — Storage buckets
-- outfit-photos: private, user-scoped path "{user_id}/{analysis_id}.jpg",
--   read only via short-lived signed URLs generated server-side.
-- avatars: public read, path "{user_id}.jpg", upload restricted to owner.

insert into storage.buckets (id, name, public)
values ('outfit-photos', 'outfit-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "outfit_photos_owner_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'outfit-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'outfit-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
