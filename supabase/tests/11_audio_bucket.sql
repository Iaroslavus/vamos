-- Bucket audio is world-readable. Clients cannot upload.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  (select buckets.public from storage.buckets as buckets where buckets.id = 'audio'),
  'audio bucket is public'
);

select results_eq(
  $$ select file_size_limit from storage.buckets where id = 'audio' $$,
  $$ values (2097152::bigint) $$,
  'audio clips stay within 2 MiB'
);

select is(
  (select allowed_mime_types::text[] from storage.buckets where id = 'audio'),
  array['audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mpeg']::text[],
  'audio bucket allows m4a containers and narrator mp3'
);

reset role;
insert into storage.objects (bucket_id, name)
values ('audio', 'items/a1/sample.es.mp3');

set local role anon;
select results_eq(
  $$ select name from storage.objects where name = 'items/a1/sample.es.mp3' $$,
  $$ values ('items/a1/sample.es.mp3') $$,
  'anon can read lesson audio'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('audio', 'items/a1/blocked.es.mp3') $$,
  '42501',
  null,
  'anon cannot upload lesson audio'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('audio', 'items/a1/blocked.es.mp3') $$,
  '42501',
  null,
  'authenticated users cannot upload lesson audio'
);

select * from finish();
rollback;
