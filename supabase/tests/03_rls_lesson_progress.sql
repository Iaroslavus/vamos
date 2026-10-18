-- RLS on public.lesson_progress: full CRUD on own rows, nothing on others.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true);

insert into public.lesson_progress (user_id, lesson_id, status, best_accuracy, completed_at) values
  ('11111111-1111-1111-1111-111111111111', 'a1-b1-l1', 'completed', 90, now()),
  ('11111111-1111-1111-1111-111111111111', 'a1-b1-l2', 'in_progress', null, null),
  ('22222222-2222-2222-2222-222222222222', 'a1-b1-l1', 'completed', 70, now()),
  ('33333333-3333-3333-3333-333333333333', 'a1-b1-l1', 'in_progress', 50, null);

-- ---------------------------------------------------------------------------
-- Alice
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select results_eq(
  $$ select lesson_id from public.lesson_progress order by lesson_id $$,
  $$ values ('a1-b1-l1'), ('a1-b1-l2') $$,
  'alice sees only her lesson progress'
);
select is_empty(
  $$ select 1 from public.lesson_progress where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'bob''s progress is invisible to alice'
);
select lives_ok(
  $$ insert into public.lesson_progress (user_id, lesson_id) values ('11111111-1111-1111-1111-111111111111', 'a1-b1-l3') $$,
  'alice can insert her own progress'
);
select throws_ok(
  $$ insert into public.lesson_progress (user_id, lesson_id) values ('22222222-2222-2222-2222-222222222222', 'a1-b1-l9') $$,
  '42501',
  null,
  'alice cannot insert progress for bob'
);
select isnt_empty(
  $$ update public.lesson_progress set best_accuracy = 95 where user_id = '11111111-1111-1111-1111-111111111111' and lesson_id = 'a1-b1-l1' returning lesson_id $$,
  'alice can update her own progress'
);
select is_empty(
  $$ update public.lesson_progress set best_accuracy = 100 where user_id = '22222222-2222-2222-2222-222222222222' returning lesson_id $$,
  'updating bob''s progress affects no rows'
);
select throws_ok(
  $$ update public.lesson_progress set user_id = '22222222-2222-2222-2222-222222222222' where lesson_id = 'a1-b1-l2' $$,
  '42501',
  null,
  'alice cannot reassign her rows to bob'
);
select isnt_empty(
  $$ delete from public.lesson_progress where user_id = '11111111-1111-1111-1111-111111111111' and lesson_id = 'a1-b1-l2' returning lesson_id $$,
  'alice can delete her own progress'
);
select is_empty(
  $$ delete from public.lesson_progress where user_id = '22222222-2222-2222-2222-222222222222' returning lesson_id $$,
  'deleting bob''s progress affects no rows'
);

reset role;
select results_eq(
  $$ select best_accuracy::int from public.lesson_progress where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (70) $$,
  'bob''s progress is unchanged'
);
select results_eq(
  $$ select count(*) from public.lesson_progress where user_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values (2::bigint) $$,
  'alice''s insert and delete persisted'
);

-- ---------------------------------------------------------------------------
-- Anonymous sign-in
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated", "is_anonymous": true}', true);
set local role authenticated;

select results_eq(
  $$ select user_id from public.lesson_progress $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::uuid) $$,
  'anonymous user sees only their own progress'
);
select isnt_empty(
  $$ update public.lesson_progress set status = 'completed', completed_at = now() where user_id = '33333333-3333-3333-3333-333333333333' returning lesson_id $$,
  'anonymous user can update their own progress'
);
select is_empty(
  $$ update public.lesson_progress set best_accuracy = 0 where user_id = '11111111-1111-1111-1111-111111111111' returning lesson_id $$,
  'anonymous user cannot update others'' progress'
);

-- ---------------------------------------------------------------------------
-- anon role
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select is_empty($$ select 1 from public.lesson_progress $$, 'anon role sees no lesson progress');
select throws_ok(
  $$ insert into public.lesson_progress (user_id, lesson_id) values ('11111111-1111-1111-1111-111111111111', 'x') $$,
  '42501',
  null,
  'anon role cannot insert lesson progress'
);

select * from finish();
rollback;
