-- handle_new_user(): every new auth user (email or anonymous) gets a profile and a streak row.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"display_name": "  Alice  "}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"full_name": "Bob Builder"}', false),
  ('33333333-3333-3333-3333-333333333333', null, '{}', true);

select results_eq(
  $$ select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('Alice') $$,
  'profile is created with trimmed display_name from metadata'
);

select results_eq(
  $$ select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values ('Bob Builder') $$,
  'display_name falls back to full_name'
);

select results_eq(
  $$
    select display_name is null, level::text, daily_minutes::int, spanish_variant::text, timezone, goal is null
    from public.profiles where id = '33333333-3333-3333-3333-333333333333'
  $$,
  $$ values (true, 'A1', 10, 'spain', 'UTC', true) $$,
  'anonymous sign-in gets a profile with defaults'
);

select results_eq(
  $$
    select count(*) from public.streaks
    where user_id in (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333'
    )
  $$,
  $$ values (3::bigint) $$,
  'a streak row is created for every new user'
);

select results_eq(
  $$
    select current, longest, freezes::int, last_active_date is null
    from public.streaks where user_id = '11111111-1111-1111-1111-111111111111'
  $$,
  $$ values (0, 0, 0, true) $$,
  'streak starts at zero'
);

-- Overly long names must not break signup.
insert into auth.users (id, email, raw_user_meta_data)
values ('44444444-4444-4444-4444-444444444444', 'carol@example.com', jsonb_build_object('display_name', repeat('x', 100)));

select results_eq(
  $$ select char_length(display_name) from public.profiles where id = '44444444-4444-4444-4444-444444444444' $$,
  $$ values (60) $$,
  'long display_name is truncated to 60 characters'
);

-- Deleting the auth user removes dependent rows.
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';

select is_empty(
  $$ select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'profile is removed together with the auth user'
);
select is_empty(
  $$ select 1 from public.streaks where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'streak is removed together with the auth user'
);

select * from finish();
rollback;
