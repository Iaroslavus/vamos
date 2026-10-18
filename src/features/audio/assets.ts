import type { AudioSource } from 'expo-audio';

/**
 * Bundled TTS files keyed by content path (e.g. `a1/hola.mp3`).
 * Empty until assets are generated into the app bundle / Supabase Storage.
 */
export const BUNDLED_AUDIO_ASSETS: Record<string, AudioSource> = {};
