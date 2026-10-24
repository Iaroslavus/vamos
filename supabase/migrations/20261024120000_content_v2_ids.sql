-- Move pre-v2 vocabulary and lesson ids onto the content v2 ids.
-- Grouped numbers (cuatro+cinco, seis+siete, ocho+nueve) collapse to one card:
-- the row with more reviews is kept; a tie keeps the row already on the new id.
-- Safe to run again: ids that are already new are left alone.

create or replace function public.remap_content_v2_ids()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair record;
begin
  for pair in
    select *
    from (
      values
        ('hola'::text, 'hola.hola'::text),
        ('buenos-dias', 'hola.buenos_dias'),
        ('buenas-tardes', 'hola.buenas_tardes'),
        ('buenas-noches', 'hola.buenas_noches'),
        ('adios', 'hola.adios'),
        ('hasta-luego', 'hola.hasta_luego'),
        ('por-favor', 'hola.por_favor'),
        ('gracias', 'hola.gracias'),
        ('me-llamo', 'hola.me_llamo'),
        ('como-te-llamas', 'hola.como_te_llamas'),
        ('mucho-gusto', 'hola.mucho_gusto'),
        ('soy', 'hola.soy'),
        ('de', 'hola.de'),
        ('encantado', 'hola.encantado'),
        ('usted', 'hola.usted'),
        ('uno', 'numbers.uno'),
        ('dos', 'numbers.dos'),
        ('tres', 'numbers.tres'),
        ('cuatro', 'numbers.cuatro_y_cinco'),
        ('cinco', 'numbers.cuatro_y_cinco'),
        ('seis', 'numbers.seis_y_siete'),
        ('siete', 'numbers.seis_y_siete'),
        ('ocho', 'numbers.ocho_y_nueve'),
        ('nueve', 'numbers.ocho_y_nueve'),
        ('diez', 'numbers.numero_diez')
    ) as map(old_id, new_id)
  loop
    delete from public.review_cards as old_card
    using public.review_cards as new_card
    where old_card.item_id = pair.old_id
      and new_card.id <> old_card.id
      and new_card.user_id = old_card.user_id
      and new_card.direction = old_card.direction
      and new_card.item_id = pair.new_id
      and new_card.reps >= old_card.reps;

    delete from public.review_cards as new_card
    using public.review_cards as old_card
    where new_card.item_id = pair.new_id
      and old_card.id <> new_card.id
      and old_card.user_id = new_card.user_id
      and old_card.direction = new_card.direction
      and old_card.item_id = pair.old_id
      and old_card.reps > new_card.reps;

    update public.review_cards
    set item_id = pair.new_id
    where item_id = pair.old_id;
  end loop;

  for pair in
    select *
    from (
      values
        ('a1-u01-l01'::text, 'a1.hola.l1'::text),
        ('a1-u01-l02', 'a1.hola.l2'),
        ('a1-u01-l03', 'a1.numbers.l1')
    ) as map(old_id, new_id)
  loop
    delete from public.lesson_progress as old_row
    using public.lesson_progress as new_row
    where old_row.lesson_id = pair.old_id
      and new_row.user_id = old_row.user_id
      and new_row.lesson_id = pair.new_id
      and (
        coalesce(new_row.best_accuracy, -1),
        (new_row.status = 'completed')::integer
      ) >= (
        coalesce(old_row.best_accuracy, -1),
        (old_row.status = 'completed')::integer
      );

    delete from public.lesson_progress as new_row
    using public.lesson_progress as old_row
    where new_row.lesson_id = pair.new_id
      and old_row.user_id = new_row.user_id
      and old_row.lesson_id = pair.old_id
      and (
        coalesce(old_row.best_accuracy, -1),
        (old_row.status = 'completed')::integer
      ) > (
        coalesce(new_row.best_accuracy, -1),
        (new_row.status = 'completed')::integer
      );

    update public.lesson_progress
    set lesson_id = pair.new_id
    where lesson_id = pair.old_id;
  end loop;
end;
$$;

comment on function public.remap_content_v2_ids() is
  'Rewrites review_cards.item_id and lesson_progress.lesson_id from the pre-v2 content ids to content v2. Idempotent.';

revoke all on function public.remap_content_v2_ids() from public, anon, authenticated;

select public.remap_content_v2_ids();
