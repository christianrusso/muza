-- outfit_photos_owner_all restricts all storage access to the photo's owner,
-- so the community feed (which shows other users' photos) could never
-- generate a signed URL for them. Mirror the community_feed_view exception:
-- once an analysis is attached to a published community post, its photo
-- becomes readable by any authenticated user.
create policy "outfit_photos_community_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'outfit-photos'
    and exists (
      select 1
      from public.community_posts cp
      join public.analyses a on a.id = cp.analysis_id
      where a.photo_path = storage.objects.name
    )
  );
