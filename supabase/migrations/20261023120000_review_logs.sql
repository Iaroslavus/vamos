-- FSRS review history. review_cards already holds the current schedule.
-- client_id makes a retried sync insert the same rating once.
-- (card_id, user_id) references the caller's own card, so a log cannot point at someone else's.

alter table public.review_cards
  add constraint review_cards_id_user_id_key unique (id, user_id);

comment on constraint review_cards_id_user_id_key on public.review_cards is
  'Lets review_logs reference (card_id, user_id) and refuse another learner''s card.';

create table public.review_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null,
  rating smallint not null check (rating between 1 and 4),
  reviewed_at timestamptz not null,
  elapsed_days integer not null check (elapsed_days >= 0),
  scheduled_days integer not null check (scheduled_days >= 0),
  state smallint not null check (state between 0 and 3),
  client_id text not null check (char_length(client_id) between 1 and 200),
  created_at timestamptz not null default now(),
  constraint review_logs_card_user_fkey
    foreign key (card_id, user_id)
    references public.review_cards (id, user_id)
    on delete cascade,
  constraint review_logs_user_client_id_key unique (user_id, client_id)
);

comment on table public.review_logs is
  'Append-only FSRS review history. client_id is the device idempotency key: a retried sync inserts the row once.';
comment on column public.review_logs.rating is 'ts-fsrs Rating: 1 Again, 2 Hard, 3 Good, 4 Easy.';
comment on column public.review_logs.reviewed_at is 'When the learner rated the card.';
comment on column public.review_logs.elapsed_days is
  'Days since the previous review (ts-fsrs ReviewLog.elapsed_days).';
comment on column public.review_logs.scheduled_days is
  'Interval the card had been scheduled for, in days (ts-fsrs ReviewLog.scheduled_days). The next interval lives on review_cards.';
comment on column public.review_logs.state is
  'ts-fsrs ReviewLog.state: card state before this rating. 0 New, 1 Learning, 2 Review, 3 Relearning.';
comment on column public.review_logs.client_id is
  'Idempotency key generated on the device. A retry of the same rating reuses it so the log is not doubled.';

create index review_logs_user_reviewed_idx on public.review_logs (user_id, reviewed_at desc);

alter table public.review_logs enable row level security;

create policy "review_logs: select own"
  on public.review_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "review_logs: insert own"
  on public.review_logs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Delete stays so ON DELETE CASCADE from review_cards can remove the caller's own logs.
-- There is no update policy: a rating, once written, is not edited.
create policy "review_logs: delete own"
  on public.review_logs for delete
  to authenticated
  using ((select auth.uid()) = user_id);
