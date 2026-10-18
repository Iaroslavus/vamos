-- RLS on public.profiles: own row only; anonymous sign-in behaves the same; anon role sees nothing.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Fixtures (as postgres): the trigger creates a profile for each.
insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"display_name": "Alice"}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"display_name": "Bob"}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true),
  ('44444444-4444-4444-4444-444444444444', 'dave@example.com', '{}', false);

-- Dave's profile is removed so that "insert" paths can be exercised without PK conflicts.
delete from public.profiles where id = '44444444-4444-4444-4444-444444444444';

-- ---------------------------------------------------------------------------
-- Alice (regular authenticated user)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'alice sees only her own profile'
);
select is_empty(
  $$ select id from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  'bob''s profile is invisible to alice even when addressed directly'
);
select isnt_empty(
  $$ update public.profiles set display_name = 'Alicia', level = 'A2' where id = '11111111-1111-1111-1111-111111111111' returning id $$,
  'alice can update her own profile'
);
select is_empty(
  $$ update public.profiles set display_name = 'hacked' where id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'updating bob''s profile affects no rows'
);
select is_empty(
  $$ delete from public.profiles where id = '11111111-1111-1111-1111-111111111111' returning id $$,
  'profiles cannot be deleted through the API (no delete policy)'
);
select throws_ok(
  $$ insert into public.profiles (id) values ('44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'alice cannot insert a profile for another user'
);

-- Alice can (re)create her own profile row.
reset role;
delete from public.profiles where id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;
select lives_ok(
  $$ insert into public.profiles (id, display_name) values ('11111111-1111-1111-1111-111111111111', 'Alice again') $$,
  'alice can insert her own profile'
);

-- Verify as postgres that nothing leaked.
reset role;
select results_eq(
  $$ select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('Bob') $$,
  'bob''s profile is unchanged'
);
select results_eq(
  $$ select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Alice again') $$,
  'alice''s insert persisted'
);
select is_empty(
  $$ select 1 from public.profiles where id = '44444444-4444-4444-4444-444444444444' $$,
  'no profile was created for dave'
);

-- ---------------------------------------------------------------------------
-- Anonymous sign-in (authenticated role, is_anonymous claim)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "is_anonymous": true}', true);
set local role authenticated;

select results_eq(
  $$ select id from public.profiles $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::uuid) $$,
  'anonymous user sees only their own profile'
);
select isnt_empty(
  $$ update public.profiles set daily_minutes = 20 where id = '33333333-3333-3333-3333-333333333333' returning id $$,
  'anonymous user can update their own profile'
);
select is_empty(
  $$ update public.profiles set daily_minutes = 30 where id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'anonymous user cannot update other profiles'
);

-- ---------------------------------------------------------------------------
-- anon role (no session at all)
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select id from public.profiles $$, 'anon role sees no profiles');
select throws_ok(
  $$ insert into public.profiles (id) values ('44444444-4444-4444-4444-444444444444') $$,
  '42501',
  null,
  'anon role cannot insert profiles'
);
select is_empty(
  $$ update public.profiles set display_name = 'x' returning id $$,
  'anon role cannot update profiles'
);

select * from finish();
rollback;
