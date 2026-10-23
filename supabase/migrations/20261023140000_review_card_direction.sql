-- Recognition and recall are separate FSRS cards for the same word.
-- Cards created before this migration are recognition (es → ru).

alter table public.review_cards
  add column direction text not null default 'es_to_ru'
    check (direction in ('es_to_ru', 'ru_to_es'));

alter table public.review_cards
  drop constraint review_cards_user_id_item_id_key;

alter table public.review_cards
  add constraint review_cards_user_item_direction_key
    unique (user_id, item_id, direction);

comment on column public.review_cards.direction is
  'es_to_ru: recognize Spanish. ru_to_es: produce Spanish. Recall is inserted after the first successful recognition review.';

comment on table public.review_cards is
  'FSRS card per (user, vocabulary item, direction). Field names mirror ts-fsrs Card.';
