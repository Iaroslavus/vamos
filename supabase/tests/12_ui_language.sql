-- profiles.ui_language is covered by the existing own-row policies. This file does not create policies.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select has_type('public', 'ui_language', 'ui_language enum exists');
select has_column('public', 'profiles', 'ui_language', 'profiles.ui_language exists');
select results_eq(
  $$ select atttypid::regtype::text
     from pg_attribute
     where attrelid = 'public.profiles'::regclass and attname = 'ui_language' and not attisdropped $$,
  $$ values ('ui_language') $$,
  'profiles.ui_language is the ui_language enum'
);
select col_is_null('public', 'profiles', 'ui_language', 'ui_language stays null until the app stores one');
select is(
  (
    select string_agg(p.polname::text, ',' order by p.polname::text collate "C")
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
  ),
  'profiles: insert own,profiles: select own,profiles: update own',
  'profiles RLS policies are unchanged'
);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false);

select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
set local role authenticated;

select lives_ok(
  $$ update public.profiles set ui_language = 'uk' where id = '11111111-1111-1111-1111-111111111111' $$,
  'alice can set her own interface language'
);
select results_eq(
  $$ select ui_language::text from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('uk') $$,
  'alice reads her interface language back'
);
select is_empty(
  $$ update public.profiles set ui_language = 'en' where id = '22222222-2222-2222-2222-222222222222' returning id $$,
  'alice cannot change bob''s interface language'
);
select throws_ok(
  $$ update public.profiles set ui_language = 'fr' where id = '11111111-1111-1111-1111-111111111111' $$,
  '22P02',
  null,
  'ui_language rejects a language outside ru, uk, en'
);

reset role;
select results_eq(
  $$ select ui_language::text from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (null::text) $$,
  'bob''s interface language is unchanged'
);
select results_eq(
  $$ select ui_language::text from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('uk') $$,
  'alice''s interface language persisted'
);

select * from finish();
rollback;
