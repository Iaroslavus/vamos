/** Supabase Storage bucket for pre-generated lesson audio. */
export const AUDIO_BUCKET = 'audio';

/** Public object URL. The app falls back to device TTS when this cannot be played. */
export function publicAudioUrl(objectPath: string, supabaseUrl: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const suffix = objectPath.replace(/^\/+/, '');
  return `${base}/storage/v1/object/public/${AUDIO_BUCKET}/${suffix}`;
}
