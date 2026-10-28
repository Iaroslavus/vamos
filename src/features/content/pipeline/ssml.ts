import type { AudioSpeed } from '@/features/audio/select';

/**
 * Multiplier for Google `speakingRate` and OpenAI `speed`.
 * 1 is the provider default; a value below 1 is slower.
 */
export const SLOW_SPEAKING_RATE = 0.75;

/**
 * Azure SSML relative rate. A percentage with no sign speeds the voice up
 * (`75%` is 75% faster). `-25%` is 25% slower than the neural default.
 */
export const SLOW_PROSODY = '-25%';

export type TtsLocale = 'es-ES' | 'es-MX';

export function escapeSsml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Neural SSML. Slow clips use prosody; they are not a sped-down copy of the normal file. */
export function spanishSsml(
  text: string,
  locale: TtsLocale,
  voice: string,
  speed: AudioSpeed,
): string {
  const escaped = escapeSsml(text);
  const spoken =
    speed === 'slow' ? `<prosody rate="${SLOW_PROSODY}">${escaped}</prosody>` : escaped;
  return `<speak version="1.0" xml:lang="${locale}" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${voice}">${spoken}</voice></speak>`;
}

export const AAC_BITRATE = '64k';

/**
 * Loudness, trimmed silence, AAC in an m4a container.
 * No `atempo`: speed already happened in the synthesizer.
 */
export function normalizeAudioArgs(inputPath: string, outputPath: string): string[] {
  const filter = [
    'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB:detection=peak',
    'areverse',
    'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB:detection=peak',
    'areverse',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
  ].join(',');
  return [
    '-y',
    '-i',
    inputPath,
    '-vn',
    '-af',
    filter,
    '-c:a',
    'aac',
    '-b:a',
    AAC_BITRATE,
    '-movflags',
    '+faststart',
    outputPath,
  ];
}

export function decodeTtsPayload(bytes: Uint8Array, encoding: 'bytes' | 'google-json'): Uint8Array {
  if (encoding === 'bytes') return bytes;
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || !('audioContent' in parsed)) {
    throw new Error('TTS API вернул ответ без audioContent');
  }
  const content = (parsed as { audioContent?: unknown }).audioContent;
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('TTS API вернул пустой audioContent');
  }
  return Uint8Array.from(Buffer.from(content, 'base64'));
}
