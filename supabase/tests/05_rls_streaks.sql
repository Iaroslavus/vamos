-- RLS on public.streaks: one row per user, readable/updatable only by its owner.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true),
  ('44444444-4444-4444-4444-444444444444', 'dave@example.com', '{}', false);

update public.streaks set current = 3, longest = 10, freezes = 2, last_active_date = current_date
where user_id = '22222222-2222-2222-2222-222222222222';

-- Dave's streak row is removed so "insert" paths can be exercised without PK conflicts.
delete from public.streaks where user_id = '44444444-4444-4444-4444-444444444444';

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select user_id from public.streaks $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'alice sees only her streak'
);
select is_empty(
  $$ select 1 from public.streaks where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'bob''s streak is invisible to alice'
);
select isnt_empty(
  $$ update public.streaks set current = 1, longest = 1, last_active_date = current_date where user_id = '11111111-1111-1111-1111-111111111111' returning user_id $$,
  'alice can update her own streak'
);
select is_empty(
  $$ update public.streaks set freezes = 99 where user_id = '22222222-2222-2222-2222-222222222222' returning user_id $$,
  'updating bob''s streak affects no rows'
);
select is_empty(
  $$ delete from public.streaks where user_id = '11111111-1111-1111-1111-111111111111' returning user_id $$,
  'streaks cannot be deleted through the API (no delete policy)'
);
select throws_ok(
  $$ insert into public.streaks (user_id) values ('44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'alice cannot insert a streak for another user'
);

reset role;
delete from public.streaks where user_id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select lives_ok(
  $$ insert into public.streaks (user_id, current, longest) values ('11111111-1111-1111-1111-111111111111', 0, 0) $$,
  'alice can insert her own streak row'
);

reset role;
select results_eq(
  $$ select current, longest, freezes::int from public.streaks where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (3, 10, 2) $$,
  'bob''s streak is unchanged'
);
select is_empty(
  $$ select 1 from public.streaks where user_id = '44444444-4444-4444-4444-444444444444' $$,
  'no streak was created for dave'
);

-- ---------------------------------------------------------------------------
-- Anonymous sign-in
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "is_anonymous": true}', true);
set local role authenticated;

select results_eq(
  $$ select user_id from public.streaks $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::uuid) $$,
  'anonymous user sees only their own streak'
);
select isnt_empty(
  $$ update public.streaks set current = 1, longest = 1 where user_id = '33333333-3333-3333-3333-333333333333' returning user_id $$,
  'anonymous user can update their own streak'
);
select is_empty(
  $$ update public.streaks set current = 0 where user_id = '22222222-2222-2222-2222-222222222222' returning user_id $$,
  'anonymous user cannot update others'' streaks'
);

-- ---------------------------------------------------------------------------
-- anon role
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select 1 from public.streaks $$, 'anon role sees no streaks');
select throws_ok(
  $$ insert into public.streaks (user_id) values ('44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'anon role cannot insert streaks'
);

select * from finish();
rollback;
