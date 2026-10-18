-- Create a profile and an empty streak row for every new auth user (including anonymous sign-ins).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := nullif(
    left(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name'
        )
      ),
      60
    ),
    ''
  );

  insert into public.profiles (id, display_name)
  values (new.id, v_display_name);

  insert into public.streaks (user_id)
  values (new.id);

  return new;
end;
$$;

comment on function public.handle_new_user() is 'auth.users AFTER INSERT trigger: bootstraps public.profiles and public.streaks.';

-- Only the trigger should run this; it is security definer and must not be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
