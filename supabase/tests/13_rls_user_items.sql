-- RLS on user_items, and folder rows / FSRS cards that point at them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false);

insert into public.user_items (id, user_id, es, tr) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'perro', 'собака');

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$
    insert into public.user_items (id, user_id, es, tr, note)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '11111111-1111-1111-1111-111111111111',
      '  gato  ',
      '  кот  ',
      '   '
    )
  $$,
  'alice can save her own word'
);
select results_eq(
  $$ select es, tr, note is null from public.user_items $$,
  $$ values ('gato', 'кот', true) $$,
  'the word is trimmed and a blank note is stored as null'
);
select throws_ok(
  $$
    insert into public.user_items (user_id, es, tr)
    values ('22222222-2222-2222-2222-222222222222', 'casa', 'дом')
  $$,
  '42501',
  null,
  'alice cannot save a word for bob'
);
select throws_ok(
  $$
    insert into public.user_items (user_id, es, tr)
    values ('11111111-1111-1111-1111-111111111111', '   ', 'пусто')
  $$,
  '23514',
  null,
  'spanish cannot be blank'
);
select throws_ok(
  $$
    insert into public.user_items (user_id, es, tr)
    values ('11111111-1111-1111-1111-111111111111', 'hola', '   ')
  $$,
  '23514',
  null,
  'the translation cannot be blank'
);
select throws_ok(
  $$
    insert into public.user_items (user_id, es, tr)
    values ('11111111-1111-1111-1111-111111111111', 'GATO', 'кошка')
  $$,
  '23505',
  null,
  'the same spanish line cannot be saved twice'
);
select is_empty(
  $$ select 1 from public.user_items where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'bob''s word is invisible to alice'
);
select lives_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    select id, 'hola.hola' from public.folders where system_key = 'favorites'
  $$,
  'a course phrase still has no user item'
);
select results_eq(
  $$ select user_item_id is null from public.folder_items where item_id = 'hola.hola' $$,
  $$ values (true) $$,
  'a course phrase does not link a user item'
);
select lives_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    select id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    from public.folders where system_key = 'favorites'
  $$,
  'alice can put her word in a folder'
);
select results_eq(
  $$
    select user_item_id::text
    from public.folder_items
    where item_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'the folder row points at the user item'
);
select lives_ok(
  $$
    insert into public.folder_items (folder_id, item_id)
    select id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    from public.folders where system_key = 'favorites'
  $$,
  'a foreign id stays a plain item id'
);
select results_eq(
  $$
    select user_item_id is null
    from public.folder_items
    where item_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  $$,
  $$ values (true) $$,
  'alice cannot link bob''s word'
);
select lives_ok(
  $$
    insert into public.review_cards (user_id, item_id)
    values (
      '11111111-1111-1111-1111-111111111111',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    )
  $$,
  'alice can open an FSRS card for her word'
);
select results_eq(
  $$
    select user_item_id::text
    from public.review_cards
    where item_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'the FSRS card points at the user item'
);
select isnt_empty(
  $$
    delete from public.user_items
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    returning id
  $$,
  'alice can delete her word'
);
select is_empty(
  $$
    select 1 from public.folder_items
    where item_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    union all
    select 1 from public.review_cards
    where item_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  $$,
  'deleting the word removes its folder row and FSRS card'
);

-- ---------------------------------------------------------------------------
-- anon role
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select 1 from public.user_items $$, 'anon role sees no user items');
select throws_ok(
  $$
    insert into public.user_items (user_id, es, tr)
    values ('11111111-1111-1111-1111-111111111111', 'no', 'нет')
  $$,
  '42501',
  null,
  'anon role cannot insert user items'
);

select * from finish();
rollback;
