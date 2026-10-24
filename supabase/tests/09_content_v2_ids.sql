-- Content v2 id remap: old vocabulary and lesson ids move, collisions keep the stronger row.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data, is_anonymous) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{}', false),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}', false);

insert into public.review_cards (user_id, item_id, reps) values
  ('11111111-1111-1111-1111-111111111111', 'hola', 1),
  ('11111111-1111-1111-1111-111111111111', 'buenos-dias', 1),
  ('11111111-1111-1111-1111-111111111111', 'buenas-tardes', 1),
  ('11111111-1111-1111-1111-111111111111', 'buenas-noches', 1),
  ('11111111-1111-1111-1111-111111111111', 'adios', 1),
  ('11111111-1111-1111-1111-111111111111', 'hasta-luego', 1),
  ('11111111-1111-1111-1111-111111111111', 'por-favor', 1),
  ('11111111-1111-1111-1111-111111111111', 'gracias', 1),
  ('11111111-1111-1111-1111-111111111111', 'me-llamo', 1),
  ('11111111-1111-1111-1111-111111111111', 'como-te-llamas', 1),
  ('11111111-1111-1111-1111-111111111111', 'mucho-gusto', 1),
  ('11111111-1111-1111-1111-111111111111', 'soy', 1),
  ('11111111-1111-1111-1111-111111111111', 'de', 1),
  ('11111111-1111-1111-1111-111111111111', 'encantado', 1),
  ('11111111-1111-1111-1111-111111111111', 'usted', 1),
  ('11111111-1111-1111-1111-111111111111', 'uno', 1),
  ('11111111-1111-1111-1111-111111111111', 'dos', 1),
  ('11111111-1111-1111-1111-111111111111', 'tres', 1),
  ('11111111-1111-1111-1111-111111111111', 'cuatro', 1),
  ('11111111-1111-1111-1111-111111111111', 'cinco', 1),
  ('11111111-1111-1111-1111-111111111111', 'seis', 1),
  ('11111111-1111-1111-1111-111111111111', 'siete', 1),
  ('11111111-1111-1111-1111-111111111111', 'ocho', 1),
  ('11111111-1111-1111-1111-111111111111', 'nueve', 1),
  ('11111111-1111-1111-1111-111111111111', 'diez', 1),
  ('11111111-1111-1111-1111-111111111111', 'cafe.x', 2),
  ('22222222-2222-2222-2222-222222222222', 'cuatro', 4),
  ('22222222-2222-2222-2222-222222222222', 'cinco', 1);

insert into public.lesson_progress (user_id, lesson_id, status, best_accuracy, completed_at) values
  ('11111111-1111-1111-1111-111111111111', 'a1-u01-l01', 'completed', 40, now()),
  ('11111111-1111-1111-1111-111111111111', 'a1.hola.l1', 'completed', 90, now()),
  ('22222222-2222-2222-2222-222222222222', 'a1-u01-l02', 'completed', 70, now()),
  ('22222222-2222-2222-2222-222222222222', 'a1-u01-l03', 'in_progress', null, null);

select lives_ok($$ select public.remap_content_v2_ids() $$, 'remap runs on existing rows');

select is(
  (select count(*)::int from public.review_cards where user_id = '11111111-1111-1111-1111-111111111111'),
  23,
  'alice: 25 legacy cards collapse to 22 v2 ids, plus an unmapped card'
);

select is(
  (select reps from public.review_cards where user_id = '22222222-2222-2222-2222-222222222222' and item_id = 'numbers.cuatro_y_cinco'),
  4,
  'cuatro and cinco keep the card with more reviews'
);

select is(
  (select count(*)::int from public.review_cards where item_id = 'cafe.x'),
  1,
  'an id outside the map is unchanged'
);

select is_empty(
  $$
    select 1 from public.review_cards
    where item_id in (
      'hola', 'buenos-dias', 'buenas-tardes', 'buenas-noches', 'adios', 'hasta-luego',
      'por-favor', 'gracias', 'me-llamo', 'como-te-llamas', 'mucho-gusto', 'soy', 'de',
      'encantado', 'usted', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete',
      'ocho', 'nueve', 'diez'
    )
  $$,
  'legacy vocabulary ids are gone'
);

select is(
  (
    select best_accuracy::int
    from public.lesson_progress
    where user_id = '11111111-1111-1111-1111-111111111111' and lesson_id = 'a1.hola.l1'
  ),
  90,
  'lesson progress keeps the better accuracy when both ids exist'
);

select is(
  (
    select status::text
    from public.lesson_progress
    where user_id = '22222222-2222-2222-2222-222222222222' and lesson_id = 'a1.numbers.l1'
  ),
  'in_progress',
  'an in-progress lesson is renamed'
);

select results_eq(
  $$
    select lesson_id
    from public.lesson_progress
    where user_id = '22222222-2222-2222-2222-222222222222'
    order by lesson_id
  $$,
  $$ select * from (values ('a1.hola.l2'), ('a1.numbers.l1')) as v(lesson_id) order by 1 $$,
  'bob lessons use v2 ids'
);

select is_empty(
  $$ select 1 from public.lesson_progress where lesson_id in ('a1-u01-l01', 'a1-u01-l02', 'a1-u01-l03') $$,
  'legacy lesson ids are gone'
);

select lives_ok($$ select public.remap_content_v2_ids() $$, 'remap is safe to run twice');

set local role authenticated;

select throws_ok(
  $$ select public.remap_content_v2_ids() $$,
  '42501',
  null,
  'authenticated cannot remap ids'
);

reset role;

select * from finish();
rollback;
