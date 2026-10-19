-- XP client ids are idempotent, and save_lesson_progress keeps the better accuracy.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false);

insert into public.lesson_progress (user_id, lesson_id, status, best_accuracy, completed_at) values
  ('22222222-2222-2222-2222-222222222222', 'a1-b1-l1', 'completed', 90, '2025-01-01T00:00:00Z');

select has_column('public', 'xp_events', 'client_id', 'xp_events.client_id exists');
select col_is_unique(
  'public',
  'xp_events',
  array['user_id', 'client_id'],
  'one XP award per (user, client_id)'
);
select has_function(
  'public',
  'save_lesson_progress',
  array['text', 'numeric', 'timestamp with time zone'],
  'save_lesson_progress(text, numeric, timestamptz) exists'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.save_lesson_progress(text, numeric, timestamptz)',
    'execute'
  ),
  'authenticated can save their own lesson progress'
);
select ok(
  not has_function_privilege('anon', 'public.save_lesson_progress(text, numeric, timestamptz)', 'execute'),
  'anon cannot save lesson progress'
);

select set_config(
  'request.jwt.claims',
  '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  $$ select best_accuracy::int from public.save_lesson_progress('a1-b1-l1', 70, '2026-01-01T00:00:00Z') $$,
  $$ values (70) $$,
  'the first completion stores its accuracy'
);
select results_eq(
  $$ select best_accuracy::int from public.save_lesson_progress('a1-b1-l1', 95, '2026-02-01T00:00:00Z') $$,
  $$ values (95) $$,
  'a higher accuracy replaces the stored best'
);
select results_eq(
  $$ select best_accuracy::int, completed_at = '2026-02-01T00:00:00Z'::timestamptz
     from public.save_lesson_progress('a1-b1-l1', 40, '2026-03-01T00:00:00Z') $$,
  $$ values (95, true) $$,
  'a lower accuracy does not win and completed_at stays with the best score'
);

select lives_ok(
  $$ insert into public.xp_events (user_id, amount, source, ref_id, client_id)
     values (auth.uid(), 10, 'lesson', 'a1-b1-l1', 'event-1') $$,
  'alice can insert an XP event with a client id'
);
select throws_ok(
  $$ insert into public.xp_events (user_id, amount, source, ref_id, client_id)
     values (auth.uid(), 10, 'lesson', 'a1-b1-l1', 'event-1') $$,
  '23505',
  null,
  'repeating the same client id does not insert a second XP event'
);
select lives_ok(
  $$ insert into public.xp_events (user_id, amount, source) values (auth.uid(), 1, 'review') $$,
  'an event without a client id can be inserted'
);
select lives_ok(
  $$ insert into public.xp_events (user_id, amount, source) values (auth.uid(), 1, 'review') $$,
  'events without a client id are not collapsed together'
);
select results_eq(
  $$ select sum(amount)::int from public.xp_events $$,
  $$ values (12) $$,
  'the retried lesson award was counted once'
);

reset role;
select results_eq(
  $$ select best_accuracy::int from public.lesson_progress
     where user_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (90) $$,
  'saving alice''s lesson does not change bob''s accuracy'
);

select * from finish();
rollback;
