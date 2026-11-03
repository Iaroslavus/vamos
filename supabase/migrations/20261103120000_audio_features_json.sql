-- Pronunciation references are small JSON files stored beside the clips.
-- Keep this list identical to AUDIO_BUCKET_MIME_TYPES in
-- src/features/content/pipeline/tts.ts.

update storage.buckets
set
  allowed_mime_types = array[
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/mpeg',
    'application/json'
  ]
where id = 'audio';
