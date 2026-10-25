-- Interface language for the app UI.
-- Existing profiles policies already cover every column; this migration does not add or change RLS.

create type public.ui_language as enum ('ru', 'uk', 'en');

comment on type public.ui_language is 'Interface language: Russian, Ukrainian, or English.';

alter table public.profiles
  add column ui_language public.ui_language;

comment on column public.profiles.ui_language is
  'Interface language. Null until the app stores the device default or the learner picks one.';
