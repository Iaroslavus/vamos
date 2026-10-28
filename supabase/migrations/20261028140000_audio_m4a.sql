-- m4a/aac clips from neural TTS. MPEG stays allowed for older files.

update storage.buckets
set allowed_mime_types = array['audio/mpeg', 'audio/mp4', 'audio/aac']
where id = 'audio';
