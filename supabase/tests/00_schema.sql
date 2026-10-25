-- Structural checks: tables, keys, RLS enabled everywhere, signup trigger wiring.
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'lesson_progress', 'lesson_progress table exists');
select has_table('public', 'xp_events', 'xp_events table exists');
select has_table('public', 'streaks', 'streaks table exists');
select has_table('public', 'review_cards', 'review_cards table exists');
select has_table('public', 'review_logs', 'review_logs table exists');
select has_table('public', 'folders', 'folders table exists');
select has_table('public', 'folder_items', 'folder_items table exists');

select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');
select col_is_pk('public', 'lesson_progress', array['user_id', 'lesson_id'], 'lesson_progress pk is (user_id, lesson_id)');
select col_is_pk('public', 'xp_events', 'id', 'xp_events.id is the primary key');
select col_is_pk('public', 'streaks', 'user_id', 'streaks.user_id is the primary key');
select col_is_pk('public', 'review_cards', 'id', 'review_cards.id is the primary key');
select col_is_pk('public', 'review_logs', 'id', 'review_logs.id is the primary key');
select col_is_pk('public', 'folders', 'id', 'folders.id is the primary key');
select col_is_pk('public', 'folder_items', array['folder_id', 'item_id'], 'folder_items pk is (folder_id, item_id)');
select has_column('public', 'review_cards', 'direction', 'review_cards.direction exists');
select col_not_null('public', 'review_cards', 'direction', 'review_cards.direction is required');
select col_is_unique(
  'public',
  'review_cards',
  array['user_id', 'item_id', 'direction'],
  'one review card per (user, item, direction)'
);
select col_is_unique(
  'public',
  'review_logs',
  array['user_id', 'client_id'],
  'one review log per (user, client_id)'
);

select fk_ok('public', 'profiles', 'id', 'auth', 'users', 'id', 'profiles.id references auth.users.id');

-- Every table in public must have RLS enabled and at least one policy,
-- and no policy may be granted to anon or PUBLIC.
select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  $$,
  'every public table has RLS enabled'
);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  $$,
  'every public table has at least one policy'
);

select is_empty(
  $$
    select p.polname
    from pg_policy p
    where p.polroles = '{0}'::oid[] or 'anon'::regrole::oid = any (p.polroles)
  $$,
  'no policy is granted to anon or PUBLIC'
);

select has_trigger('auth', 'users', 'on_auth_user_created', 'signup trigger exists on auth.users');
select has_function('public', 'handle_new_user', 'handle_new_user() exists');
select is_definer('public', 'handle_new_user', 'handle_new_user() is security definer');
select ok(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'authenticated cannot execute handle_new_user()'
);
select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
  'anon cannot execute handle_new_user()'
);

select * from finish();
rollback;
