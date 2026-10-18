-- RLS on public.review_cards: full CRUD on own FSRS cards, nothing on others.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true);

insert into public.review_cards (user_id, item_id, due, stability, difficulty, reps, state) values
  ('11111111-1111-1111-1111-111111111111', 'hola', now() - interval '1 day', 2.5, 5.1, 3, 2),
  ('11111111-1111-1111-1111-111111111111', 'adios', now() + interval '3 days', 1.0, 6.0, 1, 1),
  ('22222222-2222-2222-2222-222222222222', 'hola', now(), 4.0, 4.0, 5, 2),
  ('33333333-3333-3333-3333-333333333333', 'hola', now(), 0, 0, 0, 0);

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select item_id from public.review_cards order by due $$,
  $$ values ('hola'), ('adios') $$,
  'alice sees only her cards'
);
select is_empty(
  $$ select 1 from public.review_cards where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'bob''s cards are invisible to alice'
);
select results_eq(
  $$ select item_id from public.review_cards where due <= now() $$,
  $$ values ('hola') $$,
  'due query returns only alice''s due card (not bob''s "hola")'
);
select lives_ok(
  $$ insert into public.review_cards (user_id, item_id) values ('11111111-1111-1111-1111-111111111111', 'gracias') $$,
  'alice can create her own card'
);
select throws_ok(
  $$ insert into public.review_cards (user_id, item_id) values ('22222222-2222-2222-2222-222222222222', 'gracias') $$,
  '42501',
  null,
  'alice cannot create a card for bob'
);
select isnt_empty(
  $$
    update public.review_cards
    set reps = reps + 1, state = 2, stability = 3.2, last_review = now(), due = now() + interval '5 days'
    where user_id = '11111111-1111-1111-1111-111111111111' and item_id = 'hola'
    returning id
  $$,
  'alice can review (update) her own card'
);
select is_empty(
  $$ update public.review_cards set lapses = 99 where user_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'updating bob''s cards affects no rows'
);
select throws_ok(
  $$ update public.review_cards set user_id = '22222222-2222-2222-2222-222222222222' where item_id = 'adios' $$,
  '42501',
  null,
  'alice cannot hand her cards to bob'
);
select isnt_empty(
  $$ delete from public.review_cards where user_id = '11111111-1111-1111-1111-111111111111' and item_id = 'adios' returning id $$,
  'alice can delete her own card'
);
select is_empty(
  $$ delete from public.review_cards where user_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'deleting bob''s cards affects no rows'
);

reset role;
select results_eq(
  $$ select reps, lapses from public.review_cards where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (5, 0) $$,
  'bob''s card is unchanged'
);
select results_eq(
  $$ select item_id from public.review_cards where user_id = '11111111-1111-1111-1111-111111111111' order by item_id $$,
  $$ values ('gracias'), ('hola') $$,
  'alice''s insert and delete persisted'
);

-- ---------------------------------------------------------------------------
-- Anonymous sign-in
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "is_anonymous": true}', true);
set local role authenticated;

select results_eq(
  $$ select user_id from public.review_cards $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::uuid) $$,
  'anonymous user sees only their own cards'
);
select isnt_empty(
  $$ update public.review_cards set reps = 1, state = 1 where user_id = '33333333-3333-3333-3333-333333333333' returning id $$,
  'anonymous user can update their own cards'
);

-- ---------------------------------------------------------------------------
-- anon role
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select 1 from public.review_cards $$, 'anon role sees no review cards');
select throws_ok(
  $$ insert into public.review_cards (user_id, item_id) values ('11111111-1111-1111-1111-111111111111', 'x') $$,
  '42501',
  null,
  'anon role cannot insert review cards'
);

select * from finish();
rollback;
