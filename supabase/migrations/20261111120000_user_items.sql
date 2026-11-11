-- Words the learner wrote themselves. A folder row and an FSRS card point at one
-- of these, or at a course phrase, never at both.
-- es and tr are trimmed. note is optional. The same Spanish line cannot be saved twice.

create table public.user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  es text not null,
  tr text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint user_items_es_len check (char_length(es) between 1 and 80),
  constraint user_items_tr_len check (char_length(tr) between 1 and 120),
  constraint user_items_note_len check (note is null or char_length(note) between 1 and 240)
);

comment on table public.user_items is
  'A phrase the learner added. es is Spanish, tr is their translation, note is optional.';
comment on column public.user_items.es is 'Spanish line, trimmed, 1–80 characters.';
comment on column public.user_items.tr is 'Translation in the learner''s words, trimmed, 1–120 characters.';
comment on column public.user_items.note is 'Optional reminder, trimmed, 1–240 characters.';

create unique index user_items_user_es_uidx
  on public.user_items (user_id, lower(es));

create index user_items_user_idx on public.user_items (user_id, created_at);

create or replace function public.user_items_prepare()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.es := btrim(new.es);
  new.tr := btrim(new.tr);
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  return new;
end;
$$;

comment on function public.user_items_prepare() is
  'Trims Spanish, the translation, and the note. A blank note is stored as null.';

revoke execute on function public.user_items_prepare() from public, anon, authenticated;

create trigger user_items_prepare
  before insert or update on public.user_items
  for each row execute function public.user_items_prepare();

alter table public.user_items enable row level security;

create policy "user_items: select own"
  on public.user_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_items: insert own"
  on public.user_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_items: update own"
  on public.user_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_items: delete own"
  on public.user_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- folder_items.item_id stays the course phrase id, or the user item id as text.
-- user_item_id is set only when that text is this learner's user item.
alter table public.folder_items
  add column user_item_id uuid references public.user_items (id) on delete cascade;

comment on column public.folder_items.user_item_id is
  'Set when item_id is this learner''s user item. Null for a course phrase.';

alter table public.folder_items
  add constraint folder_items_user_item_matches check (
    user_item_id is null or item_id = user_item_id::text
  );

alter table public.review_cards
  add column user_item_id uuid references public.user_items (id) on delete cascade;

comment on column public.review_cards.user_item_id is
  'Set when item_id is this learner''s user item. Null for a course phrase. Same FSRS row either way.';

alter table public.review_cards
  add constraint review_cards_user_item_matches check (
    user_item_id is null or item_id = user_item_id::text
  );

create or replace function public.link_user_item_id()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid;
  linked uuid;
begin
  if new.item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    new.user_item_id := null;
    return new;
  end if;

  if tg_table_name = 'folder_items' then
    select folders.user_id into owner
    from public.folders as folders
    where folders.id = new.folder_id;
  else
    owner := new.user_id;
  end if;

  select items.id into linked
  from public.user_items as items
  where items.id = new.item_id::uuid
    and items.user_id = owner;

  new.user_item_id := linked;
  return new;
end;
$$;

comment on function public.link_user_item_id() is
  'Points a folder row or an FSRS card at the learner''s user item when item_id is that id.';

revoke execute on function public.link_user_item_id() from public, anon, authenticated;

create trigger folder_items_link_user_item
  before insert or update on public.folder_items
  for each row execute function public.link_user_item_id();

create trigger review_cards_link_user_item
  before insert or update on public.review_cards
  for each row execute function public.link_user_item_id();

-- A card or folder row may arrive before the word. Attach them once the word exists,
-- and drop every reference when the word is deleted, even if the link was still null.
create or replace function public.user_items_attach_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.folder_items as folder_item
  set user_item_id = new.id
  from public.folders as folder
  where folder_item.folder_id = folder.id
    and folder.user_id = new.user_id
    and folder_item.item_id = new.id::text
    and folder_item.user_item_id is null;

  update public.review_cards as card
  set user_item_id = new.id
  where card.user_id = new.user_id
    and card.item_id = new.id::text
    and card.user_item_id is null;

  return new;
end;
$$;

comment on function public.user_items_attach_refs() is
  'After a user item is saved, link folder rows and FSRS cards that already use its id.';

revoke execute on function public.user_items_attach_refs() from public, anon, authenticated;

create trigger user_items_attach_refs
  after insert on public.user_items
  for each row execute function public.user_items_attach_refs();

create or replace function public.user_items_drop_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.review_cards as card
  where card.user_id = old.user_id
    and (card.user_item_id = old.id or card.item_id = old.id::text);

  delete from public.folder_items as folder_item
  using public.folders as folder
  where folder_item.folder_id = folder.id
    and folder.user_id = old.user_id
    and (folder_item.user_item_id = old.id or folder_item.item_id = old.id::text);

  return old;
end;
$$;

comment on function public.user_items_drop_refs() is
  'Deleting a user item removes its folder rows and FSRS cards.';

revoke execute on function public.user_items_drop_refs() from public, anon, authenticated;

create trigger user_items_drop_refs
  before delete on public.user_items
  for each row execute function public.user_items_drop_refs();
