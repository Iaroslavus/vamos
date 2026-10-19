-- Offline sync: XP retries reuse a client id, and a lesson keeps its best accuracy.

alter table public.xp_events
  add column client_id text;

alter table public.xp_events
  add constraint xp_events_client_id_len
    check (client_id is null or char_length(client_id) between 1 and 200);

alter table public.xp_events
  add constraint xp_events_user_client_id_key unique (user_id, client_id);

comment on column public.xp_events.client_id is
  'Idempotency key generated on the device. A retry of the same award reuses it so XP is not doubled. Nulls are legacy rows and are not collapsed.';

-- Best accuracy wins. A retried or older completion cannot lower the stored score.
create or replace function public.save_lesson_progress(
  p_lesson_id text,
  p_best_accuracy numeric,
  p_completed_at timestamptz
)
returns public.lesson_progress
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.lesson_progress;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_lesson_id is null or char_length(p_lesson_id) < 1 or char_length(p_lesson_id) > 100 then
    raise exception 'invalid lesson_id' using errcode = '22023';
  end if;

  if p_best_accuracy is null or p_best_accuracy < 0 or p_best_accuracy > 100 then
    raise exception 'invalid accuracy' using errcode = '22023';
  end if;

  if p_completed_at is null then
    raise exception 'completed_at required' using errcode = '22023';
  end if;

  insert into public.lesson_progress as lp (
    user_id,
    lesson_id,
    status,
    best_accuracy,
    completed_at
  )
  values (
    auth.uid(),
    p_lesson_id,
    'completed'::public.lesson_status,
    p_best_accuracy,
    p_completed_at
  )
  on conflict (user_id, lesson_id) do update
    set
      best_accuracy = greatest(
        coalesce(lp.best_accuracy, excluded.best_accuracy),
        excluded.best_accuracy
      ),
      status = 'completed'::public.lesson_status,
      completed_at = case
        when coalesce(excluded.best_accuracy, -1) > coalesce(lp.best_accuracy, -1)
          then excluded.completed_at
        else coalesce(lp.completed_at, excluded.completed_at)
      end
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.save_lesson_progress(text, numeric, timestamptz) is
  'Upserts the caller''s lesson progress. The higher best_accuracy wins; a tie keeps the stored completed_at.';

revoke all on function public.save_lesson_progress(text, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.save_lesson_progress(text, numeric, timestamptz) to authenticated;
