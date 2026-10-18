-- Core learner schema: profile, lesson progress, XP ledger, streaks and FSRS review cards.
-- RLS policies live in 20261019000300_rls_policies.sql; the signup trigger in 20261019000200_auth_triggers.sql.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
comment on type public.cefr_level is 'CEFR proficiency level the learner is currently working on.';

create type public.learning_goal as enum ('travel', 'work', 'relocation', 'dele');
comment on type public.learning_goal is 'Why the learner studies Spanish (picked in onboarding).';

create type public.spanish_variant as enum ('spain', 'latam');
comment on type public.spanish_variant is 'Preferred variant of Spanish for audio and vocabulary.';

create type public.lesson_status as enum ('in_progress', 'completed');
comment on type public.lesson_status is 'Lesson progress state. "Not started" lessons simply have no row.';

create type public.xp_source as enum ('lesson', 'review', 'streak_bonus', 'chat', 'other');
comment on type public.xp_source is 'What produced an XP event.';

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, created by trigger on signup
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  level public.cefr_level not null default 'A1',
  goal public.learning_goal,
  daily_minutes smallint not null default 10 check (daily_minutes in (5, 10, 20, 30)),
  spanish_variant public.spanish_variant not null default 'spain',
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Learner profile and study preferences. id = auth.uid().';
comment on column public.profiles.timezone is 'IANA time zone name, used to compute streak days and reminders.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- lesson_progress — best result per lesson
-- ---------------------------------------------------------------------------

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) between 1 and 100),
  status public.lesson_status not null default 'in_progress',
  best_accuracy numeric(5, 2) check (best_accuracy is null or best_accuracy between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id),
  constraint lesson_progress_completed_at_matches_status
    check ((status = 'completed') = (completed_at is not null))
);

comment on table public.lesson_progress is 'Per-user progress on lessons from content/ (lesson_id is the JSON lesson id).';
comment on column public.lesson_progress.best_accuracy is 'Best accuracy across attempts, percent 0–100.';

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- xp_events — append-only XP ledger
-- ---------------------------------------------------------------------------

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount > 0),
  source public.xp_source not null,
  ref_id text check (ref_id is null or char_length(ref_id) between 1 and 100),
  created_at timestamptz not null default now()
);

comment on table public.xp_events is 'Append-only XP ledger; total XP = sum(amount) per user.';
comment on column public.xp_events.ref_id is 'Optional reference: lesson id, review session id, chat session id.';

create index xp_events_user_created_idx on public.xp_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- streaks — one row per user, created with the profile
-- ---------------------------------------------------------------------------

create table public.streaks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current integer not null default 0 check (current >= 0),
  longest integer not null default 0 check (longest >= 0),
  last_active_date date,
  freezes smallint not null default 0 check (freezes >= 0),
  updated_at timestamptz not null default now(),
  constraint streaks_longest_gte_current check (longest >= current)
);

comment on table public.streaks is 'Daily study streak. last_active_date is in the user''s profile timezone.';
comment on column public.streaks.freezes is 'Number of unused streak freezes.';

create trigger streaks_set_updated_at
  before update on public.streaks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- review_cards — spaced repetition state (ts-fsrs Card)
-- ---------------------------------------------------------------------------

create table public.review_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 100),
  due timestamptz not null default now(),
  stability double precision not null default 0 check (stability >= 0),
  difficulty double precision not null default 0 check (difficulty >= 0),
  elapsed_days integer not null default 0 check (elapsed_days >= 0),
  scheduled_days integer not null default 0 check (scheduled_days >= 0),
  learning_steps integer not null default 0 check (learning_steps >= 0),
  reps integer not null default 0 check (reps >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  state smallint not null default 0 check (state between 0 and 3),
  last_review timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);

comment on table public.review_cards is 'FSRS card per (user, vocabulary item). Field names mirror ts-fsrs Card.';
comment on column public.review_cards.item_id is 'Vocabulary item id from content/ JSON.';
comment on column public.review_cards.state is 'ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning.';

create index review_cards_user_due_idx on public.review_cards (user_id, due);

create trigger review_cards_set_updated_at
  before update on public.review_cards
  for each row execute function public.set_updated_at();
