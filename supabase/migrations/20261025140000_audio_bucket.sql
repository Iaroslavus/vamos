-- Public lesson audio. The app may read objects. Uploads are not granted to clients.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 5242880, array['audio/mpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "audio_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'audio');
