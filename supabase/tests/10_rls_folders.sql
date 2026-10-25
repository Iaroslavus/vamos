-- RLS on folders and folder_items, plus the difficult-item rule.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true);

insert into public.folders (id, user_id, name, color, kind)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Bob', 'ink', 'custom');

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select system_key from public.folders where system_key is not null order by system_key $$,
  $$ values ('difficult'), ('favorites') $$,
  'alice sees her two system folders'
);
select is_empty(
  $$ select 1 from public.folders where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'bob''s folders are invisible to alice'
);
select lives_ok(
  $$
    insert into public.folders (user_id, name, color, kind)
    values ('11111111-1111-1111-1111-111111111111', 'Для переезда', 'blue', 'custom')
  $$,
  'alice can create a custom folder'
);
select throws_ok(
  $$
    insert into public.folders (user_id, name, color, kind)
    values ('22222222-2222-2222-2222-222222222222', 'Чужое', 'ink', 'custom')
  $$,
  '42501',
  null,
  'alice cannot create a folder for bob'
);
select throws_ok(
  $$
    insert into public.folders (user_id, name, color, kind, system_key)
    values ('11111111-1111-1111-1111-111111111111', 'Ещё', 'saffron', 'custom', 'favorites')
  $$,
  '23514',
  null,
  'a custom folder cannot carry a system key'
);
select isnt_empty(
  $$ update public.folders set name = 'Переезд', color = 'teal' where name = 'Для переезда' returning id $$,
  'alice can rename and recolor her custom folder'
);
select throws_ok(
  $$ update public.folders set name = 'Моё' where system_key = 'favorites' $$,
  '42501',
  null,
  'a system folder cannot be renamed'
);
select is_empty(
  $$ delete from public.folders where system_key = 'favorites' returning id $$,
  'a system folder cannot be deleted'
);
select lives_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    select id, 'hola.hola' from public.folders where system_key = 'favorites'
  $$,
  'alice can save a word into favorites'
);
select throws_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hola.hola')
  $$,
  '42501',
  null,
  'alice cannot put a word into bob''s folder'
);
select isnt_empty(
  $$ delete from public.folder_items where item_id = 'hola.hola' returning folder_id $$,
  'alice can remove her own folder item'
);
select lives_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    select id, 'hola.adios' from public.folders where system_key = 'difficult'
  $$,
  'the client may sync membership of the difficult folder'
);
select lives_ok(
  $$
    insert into public.folders (user_id, name, color, kind, topic_id)
    values ('11111111-1111-1111-1111-111111111111', 'Hola', 'teal', 'system', 'a1.hola')
  $$,
  'alice can store a passed topic folder'
);
select throws_ok(
  $$
    insert into public.folders (user_id, name, color, kind, system_key)
    values ('11111111-1111-1111-1111-111111111111', 'Ещё избранное', 'saffron', 'system', 'favorites')
  $$,
  '23505',
  null,
  'favorites is created only once'
);
select throws_ok(
  $$
    insert into public.folders (user_id, name, color, kind)
    values ('11111111-1111-1111-1111-111111111111', 'Красная', '#ff0000', 'custom')
  $$,
  '23514',
  null,
  'color is a design token'
);
select throws_ok(
  $$ update public.folders set user_id = '22222222-2222-2222-2222-222222222222' where kind = 'custom' $$,
  '42501',
  null,
  'alice cannot hand a folder to bob'
);
select lives_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    select id, 'hola.gracias' from public.folders where kind = 'custom'
  $$,
  'alice can save a word into a custom folder'
);
select isnt_empty(
  $$ delete from public.folders where kind = 'custom' and topic_id is null returning id $$,
  'alice can delete a custom folder'
);
select is_empty(
  $$ select 1 from public.folder_items where item_id = 'hola.gracias' $$,
  'deleting a custom folder removes its items'
);
select throws_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    values ('99999999-9999-9999-9999-999999999999', 'hola.hola')
  $$,
  '42501',
  null,
  'an item needs a folder alice can see'
);

-- Difficult words: two Again ratings in 14 days. Inserted as alice so RLS applies.
insert into public.review_cards (id, user_id, item_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'hola'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'adios');
insert into public.review_logs (user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1, now() - interval '1 day', 0, 0, 2, 'e1'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 1, now() - interval '2 days', 0, 0, 2, 'e2'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1, now() - interval '1 day', 0, 0, 2, 'e3'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 1, now() - interval '20 days', 0, 0, 2, 'e4'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 2, now(), 0, 0, 2, 'e5');

select results_eq(
  $$ select item_id from public.difficult_item_ids('11111111-1111-1111-1111-111111111111') $$,
  $$ values ('hola') $$,
  'two Again ratings in 14 days mark a difficult word'
);

-- ---------------------------------------------------------------------------
-- Bob cannot read Alice's mistakes through the function
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
set local role authenticated;

select is_empty(
  $$ select item_id from public.difficult_item_ids('11111111-1111-1111-1111-111111111111') $$,
  'bob cannot read alice''s difficult words'
);

-- ---------------------------------------------------------------------------
-- Anonymous sign-in
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "is_anonymous": true}', true);
set local role authenticated;

select results_eq(
  $$ select count(*) from public.folders $$,
  $$ values (2::bigint) $$,
  'anonymous sign-in gets the two system folders'
);

-- ---------------------------------------------------------------------------
-- anon role
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select 1 from public.folders $$, 'anon role sees no folders');
select throws_ok(
  $$
    insert into public.folders (user_id, name, color, kind)
    values ('11111111-1111-1111-1111-111111111111', 'Нет', 'ink', 'custom')
  $$,
  '42501',
  null,
  'anon role cannot insert folders'
);

select * from finish();
rollback;
