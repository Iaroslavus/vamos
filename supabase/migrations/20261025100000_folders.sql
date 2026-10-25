-- Personal vocabulary folders. One FSRS card still belongs to the word, not the folder.
-- Favorites and Difficult are created with the profile. Topic folders are inserted by the
-- client once every lesson in that topic is completed. Difficult membership is derived
-- from Again ratings (rating = 1) in the last 14 days: two or more put the word in Сложные.

create type public.folder_kind as enum ('system', 'custom');
comment on type public.folder_kind is
  'system: Избранное, Сложные, or a passed topic. custom: a folder the learner named.';

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text not null check (color in ('coral', 'saffron', 'teal', 'blue', 'ink')),
  kind public.folder_kind not null,
  topic_id text check (topic_id is null or char_length(topic_id) between 1 and 100),
  system_key text check (system_key is null or system_key in ('favorites', 'difficult')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint folders_shape check (
    (kind = 'custom' and system_key is null and topic_id is null)
    or (kind = 'system' and system_key = 'favorites' and topic_id is null)
    or (kind = 'system' and system_key = 'difficult' and topic_id is null)
    or (kind = 'system' and system_key is null and topic_id is not null)
  )
);

comment on table public.folders is
  'Learner vocabulary folders. system_key marks Избранное and Сложные; topic_id marks a passed topic.';
comment on column public.folders.color is 'Design-token name: coral, saffron, teal, blue, or ink.';
comment on column public.folders.topic_id is 'Content topic id. Set only for the system folder of a passed topic.';
comment on column public.folders.system_key is 'favorites or difficult. Null for custom folders and topic folders.';

create unique index folders_user_system_key_uidx
  on public.folders (user_id, system_key)
  where system_key is not null;

create unique index folders_user_topic_uidx
  on public.folders (user_id, topic_id)
  where topic_id is not null;

create trigger folders_set_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

-- Identity of a system folder stays put. Learners rename and recolor only custom folders.
create or replace function public.folders_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.kind is distinct from old.kind
     or new.system_key is distinct from old.system_key
     or new.topic_id is distinct from old.topic_id
  then
    raise exception 'folder identity is fixed' using errcode = '42501';
  end if;

  if old.kind = 'system'
     and (new.name is distinct from old.name or new.color is distinct from old.color)
  then
    raise exception 'system folder cannot be edited' using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.folders_guard_update() is
  'Rejects handing a folder to someone else and editing a system folder.';

revoke execute on function public.folders_guard_update() from public, anon, authenticated;

create trigger folders_guard_update
  before update on public.folders
  for each row execute function public.folders_guard_update();

create table public.folder_items (
  folder_id uuid not null references public.folders (id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 100),
  added_at timestamptz not null default now(),
  primary key (folder_id, item_id)
);

comment on table public.folder_items is
  'Words and phrases saved in a folder. item_id is the content item id. The same item may sit in several folders.';
comment on column public.folder_items.added_at is 'When the learner (or a system rule) put the item in this folder.';

create index folder_items_item_idx on public.folder_items (item_id);

alter table public.folders enable row level security;
alter table public.folder_items enable row level security;

create policy "folders: select own"
  on public.folders for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "folders: insert own"
  on public.folders for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "folders: update own"
  on public.folders for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "folders: delete own custom"
  on public.folders for delete
  to authenticated
  using ((select auth.uid()) = user_id and kind = 'custom');

create policy "folder_items: select own"
  on public.folder_items for select
  to authenticated
  using (
    exists (
      select 1 from public.folders
      where folders.id = folder_id
        and folders.user_id = (select auth.uid())
    )
  );

create policy "folder_items: insert own"
  on public.folder_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.folders
      where folders.id = folder_id
        and folders.user_id = (select auth.uid())
    )
  );

create policy "folder_items: delete own"
  on public.folder_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.folders
      where folders.id = folder_id
        and folders.user_id = (select auth.uid())
    )
  );

-- Again (rating 1) at least twice in the last 14 days. Mirrors src/features/vocab/model.ts.
create or replace function public.difficult_item_ids(
  p_user_id uuid,
  p_now timestamptz default now()
)
returns table (item_id text)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.item_id
  from public.review_logs as l
  join public.review_cards as c
    on c.id = l.card_id
   and c.user_id = l.user_id
  where l.user_id = p_user_id
    and l.rating = 1
    and l.reviewed_at >= p_now - interval '14 days'
    and l.reviewed_at <= p_now
  group by c.item_id
  having count(*) >= 2
  order by c.item_id
$$;

comment on function public.difficult_item_ids(uuid, timestamptz) is
  'Items with at least two Again ratings in the 14 days ending at p_now. RLS hides other learners.';

revoke all on function public.difficult_item_ids(uuid, timestamptz) from public;
grant execute on function public.difficult_item_ids(uuid, timestamptz) to authenticated;

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
    (new.id, 'Избранное', 'saffron', 'system', 'favorites'),
    (new.id, 'Сложные', 'coral', 'system', 'difficult');

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users AFTER INSERT trigger: bootstraps public.profiles, public.streaks, and the two system folders.';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

insert into public.folders (user_id, name, color, kind, system_key)
select profiles.id, 'Избранное', 'saffron', 'system', 'favorites'
from public.profiles as profiles
where not exists (
  select 1 from public.folders as folders
  where folders.user_id = profiles.id and folders.system_key = 'favorites'
);

insert into public.folders (user_id, name, color, kind, system_key)
select profiles.id, 'Сложные', 'coral', 'system', 'difficult'
from public.profiles as profiles
where not exists (
  select 1 from public.folders as folders
  where folders.user_id = profiles.id and folders.system_key = 'difficult'
);
