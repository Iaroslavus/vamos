-- Row Level Security: every user (including anonymous sign-ins, which also use the
-- `authenticated` role) sees and changes only their own rows. The `anon` role (no session)
-- gets no policies and therefore no rows.
--
-- `(select auth.uid())` instead of `auth.uid()` lets Postgres evaluate it once per query.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: insert own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy: a profile is removed together with the auth user (on delete cascade).

-- ---------------------------------------------------------------------------
-- lesson_progress
-- ---------------------------------------------------------------------------

alter table public.lesson_progress enable row level security;

create policy "lesson_progress: select own"
  on public.lesson_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "lesson_progress: insert own"
  on public.lesson_progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "lesson_progress: update own"
  on public.lesson_progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "lesson_progress: delete own"
  on public.lesson_progress for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- xp_events (append-only ledger: no update/delete policies)
-- ---------------------------------------------------------------------------

alter table public.xp_events enable row level security;

create policy "xp_events: select own"
  on public.xp_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "xp_events: insert own"
  on public.xp_events for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- streaks
-- ---------------------------------------------------------------------------

alter table public.streaks enable row level security;

create policy "streaks: select own"
  on public.streaks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "streaks: insert own"
  on public.streaks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "streaks: update own"
  on public.streaks for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy: the streak row lives as long as the profile.

-- ---------------------------------------------------------------------------
-- review_cards
-- ---------------------------------------------------------------------------

alter table public.review_cards enable row level security;

create policy "review_cards: select own"
  on public.review_cards for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "review_cards: insert own"
  on public.review_cards for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "review_cards: update own"
  on public.review_cards for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "review_cards: delete own"
  on public.review_cards for delete
  to authenticated
  using ((select auth.uid()) = user_id);
