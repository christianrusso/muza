-- outfit_photos_community_read's EXISTS subquery runs under the *querying*
-- session's RLS, same trap as community_feed_view: it joins `analyses`,
-- which is owner-only, so the subquery returns no rows for anyone but the
-- photo's owner and the policy never actually grants access to other users.
-- Move the check into a security definer function (owned by postgres, which
-- bypasses RLS) so it evaluates against the real data instead of the
-- caller's restricted view of it.
create function public.is_community_photo(p_photo_path text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.community_posts cp
    join public.analyses a on a.id = cp.analysis_id
    where a.photo_path = p_photo_path
  );
$$;

drop policy "outfit_photos_community_read" on storage.objects;

create policy "outfit_photos_community_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'outfit-photos' and public.is_community_photo(name));
