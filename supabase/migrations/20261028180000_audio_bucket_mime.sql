-- m4a uploads arrive as audio/mp4. audio/x-m4a and audio/aac cover the same
-- container when a client or sniffer uses those labels. Narrator mp3 stays audio/mpeg.
-- 2 MiB is enough for a 64 kbps lesson clip.
-- Keep this list identical to AUDIO_BUCKET_MIME_TYPES in
-- src/features/content/pipeline/tts.ts.

update storage.buckets
set
  allowed_mime_types = array['audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mpeg'],
  file_size_limit = 2 * 1024 * 1024
where id = 'audio';
