-- System folder «Усі вивчені»: everything finished in lessons, plus the learner's own words.
-- Membership is rebuilt by the client. The folder cannot be renamed or deleted.

alter table public.folders drop constraint folders_shape;

alter table public.folders drop constraint if exists folders_system_key_check;

alter table public.folders
  add constraint folders_system_key_check
  check (system_key is null or system_key in ('learned', 'favorites', 'difficult'));

alter table public.folders
  add constraint folders_shape check (
    (kind = 'custom' and system_key is null and topic_id is null)
    or (kind = 'system' and system_key = 'learned' and topic_id is null)
    or (kind = 'system' and system_key = 'favorites' and topic_id is null)
    or (kind = 'system' and system_key = 'difficult' and topic_id is null)
    or (kind = 'system' and system_key is null and topic_id is not null)
  );

comment on table public.folders is
  'Learner vocabulary folders. system_key marks Усі вивчені, Избранное and Сложные; topic_id marks a passed topic.';
comment on column public.folders.system_key is
  'learned, favorites, or difficult. Null for custom folders and topic folders.';

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

  insert into public.folders (user_id, name, color, kind, system_key)
  values
    (new.id, 'Все изученные', 'teal', 'system', 'learned'),
    (new.id, 'Избранное', 'saffron', 'system', 'favorites'),
    (new.id, 'Сложные', 'coral', 'system', 'difficult');

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users AFTER INSERT trigger: bootstraps public.profiles, public.streaks, and the three system folders.';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

insert into public.folders (user_id, name, color, kind, system_key)
select profiles.id, 'Все изученные', 'teal', 'system', 'learned'
from public.profiles as profiles
where not exists (
  select 1 from public.folders as folders
  where folders.user_id = profiles.id and folders.system_key = 'learned'
);
