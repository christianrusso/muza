-- Capture the OAuth (Google) profile photo into profiles on signup.
-- Google returns these in auth.users.raw_user_meta_data as:
--   avatar_url / picture  -> profile photo URL
--   full_name  / name     -> display name
-- Email/password signups have none of these, so we fall back to the email
-- local-part for the name and leave avatar_url null.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;
