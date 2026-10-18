-- RLS on public.xp_events: append-only ledger — select/insert own, no update/delete at all.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true);

insert into public.xp_events (user_id, amount, source, ref_id) values
  ('11111111-1111-1111-1111-111111111111', 10, 'lesson', 'a1-b1-l1'),
  ('11111111-1111-1111-1111-111111111111', 5, 'review', null),
  ('22222222-2222-2222-2222-222222222222', 100, 'lesson', 'a1-b1-l1'),
  ('33333333-3333-3333-3333-333333333333', 7, 'lesson', 'a1-b1-l1');

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select sum(amount)::int from public.xp_events $$,
  $$ values (15) $$,
  'alice sees (and sums) only her XP'
);
select is_empty(
  $$ select 1 from public.xp_events where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'bob''s XP events are invisible to alice'
);
select lives_ok(
  $$ insert into public.xp_events (user_id, amount, source) values ('11111111-1111-1111-1111-111111111111', 20, 'streak_bonus') $$,
  'alice can add her own XP event'
);
select throws_ok(
  $$ insert into public.xp_events (user_id, amount, source) values ('22222222-2222-2222-2222-222222222222', 20, 'lesson') $$,
  '42501',
  null,
  'alice cannot add XP for bob'
);
select is_empty(
  $$ update public.xp_events set amount = 9999 where user_id = '11111111-1111-1111-1111-111111111111' returning id $$,
  'XP events cannot be updated, even one''s own (append-only)'
);
select is_empty(
  $$ update public.xp_events set amount = 1 where user_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'updating bob''s XP events affects no rows'
);
select is_empty(
  $$ delete from public.xp_events where user_id = '11111111-1111-1111-1111-111111111111' returning id $$,
  'XP events cannot be deleted, even one''s own (append-only)'
);
select is_empty(
  $$ delete from public.xp_events where user_id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'deleting bob''s XP events affects no rows'
);

reset role;
select results_eq(
  $$ select sum(amount)::int from public.xp_events where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (100) $$,
  'bob''s XP is unchanged'
);
select results_eq(
  $$ select sum(amount)::int from public.xp_events where user_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values (35) $$,
  'alice''s insert persisted and nothing else changed'
);

-- ---------------------------------------------------------------------------
-- Anonymous sign-in
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "is_anonymous": true}', true);
set local role authenticated;

select results_eq(
  $$ select user_id, amount from public.xp_events $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::uuid, 7) $$,
  'anonymous user sees only their own XP'
);
select lives_ok(
  $$ insert into public.xp_events (user_id, amount, source) values ('33333333-3333-3333-3333-333333333333', 3, 'review') $$,
  'anonymous user can add their own XP'
);

-- ---------------------------------------------------------------------------
-- anon role
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select 1 from public.xp_events $$, 'anon role sees no XP events');
select throws_ok(
  $$ insert into public.xp_events (user_id, amount, source) values ('11111111-1111-1111-1111-111111111111', 1, 'other') $$,
  '42501',
  null,
  'anon role cannot insert XP events'
);

select * from finish();
rollback;
