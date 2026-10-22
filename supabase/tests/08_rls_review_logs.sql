-- RLS on public.review_logs: own reviews only. No updates.
-- Repeating client_id does not insert a second row, and a log cannot cite another learner's card.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true);

insert into public.review_cards (id, user_id, item_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'hola'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'hola'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'hola');

insert into public.review_logs (
  user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id
) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, '2026-10-01T00:00:00Z', 0, 0, 0, 'alice-1'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, '2026-10-01T00:00:00Z', 2, 2, 2, 'bob-1'),
  ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 4, '2026-10-01T00:00:00Z', 0, 0, 0, 'anon-1');

select columns_are(
  'public',
  'review_logs',
  array[
    'id',
    'user_id',
    'card_id',
    'rating',
    'reviewed_at',
    'elapsed_days',
    'scheduled_days',
    'state',
    'client_id',
    'created_at'
  ],
  'review_logs stores the FSRS review'
);

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select client_id from public.review_logs order by client_id $$,
  $$ values ('alice-1') $$,
  'alice sees only her review logs'
);
select is_empty(
  $$ select 1 from public.review_logs where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'bob''s review logs are invisible to alice'
);
select lives_ok(
  $$ insert into public.review_logs (user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, now(), 1, 2, 2, 'alice-2') $$,
  'alice can insert her own review log'
);
select throws_ok(
  $$ insert into public.review_logs (user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id)
     values ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, now(), 0, 0, 0, 'alice-on-bob') $$,
  '42501',
  null,
  'alice cannot insert a review log for bob'
);
select throws_ok(
  $$ insert into public.review_logs (user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id)
     values ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, now(), 0, 0, 0, 'alice-bob-card') $$,
  '23503',
  null,
  'alice cannot attach a log to bob''s card'
);
select throws_ok(
  $$ insert into public.review_logs (user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, now(), 0, 0, 0, 'alice-2') $$,
  '23505',
  null,
  'repeating the same client id does not insert a second review log'
);
select is_empty(
  $$ update public.review_logs set rating = 1 where user_id = '11111111-1111-1111-1111-111111111111' returning id $$,
  'review logs cannot be updated, even one''s own'
);
select is_empty(
  $$ update public.review_logs set rating = 1 where user_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'updating bob''s review logs affects no rows'
);
select isnt_empty(
  $$ delete from public.review_logs where client_id = 'alice-2' returning id $$,
  'alice can delete her own review log'
);
select is_empty(
  $$ delete from public.review_logs where user_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'deleting bob''s review logs affects no rows'
);

reset role;
select results_eq(
  $$ select client_id, rating::int from public.review_logs where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('bob-1', 1) $$,
  'bob''s review log is unchanged'
);

select set_config(
  'request.jwt.claims',
  '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "is_anonymous": true}',
  true
);
set local role authenticated;

select results_eq(
  $$ select client_id from public.review_logs $$,
  $$ values ('anon-1') $$,
  'anonymous user sees only their own review logs'
);
select lives_ok(
  $$ insert into public.review_logs (user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id)
     values ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2, now(), 0, 0, 1, 'anon-2') $$,
  'anonymous user can insert their own review log'
);

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select 1 from public.review_logs $$, 'anon role sees no review logs');
select throws_ok(
  $$ insert into public.review_logs (user_id, card_id, rating, reviewed_at, elapsed_days, scheduled_days, state, client_id)
     values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, now(), 0, 0, 0, 'nope') $$,
  '42501',
  null,
  'anon role cannot insert review logs'
);

select * from finish();
rollback;
