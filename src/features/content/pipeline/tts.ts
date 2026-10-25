import { AUDIO_BUCKET } from '@/features/audio/storage';

import type { Item } from '../schema';
import { hasPlayableAudio } from './report';

/** Normal speed only. Slow playback is the device rate, not a second file. */
export const TTS_SPEED = 1;

export const DEFAULT_TTS_URL = 'https://api.openai.com/v1/audio/speech';
export const DEFAULT_TTS_MODEL = 'gpt-4o-mini-tts';
export const DEFAULT_TTS_VOICE = 'coral';

export type HttpRequest = {
  url: string;
  headers: Record<string, string>;
  body?: string;
};

export function needsGeneratedAudio(item: Item): boolean {
  return !hasPlayableAudio(item);
}

/** Object key inside the audio bucket: items/<level>/<slug>/<name>.es.mp3 */
export function audioObjectPath(item: Pick<Item, 'id' | 'level'>): string {
  const level = item.level.toLowerCase();
  const [slug, ...rest] = item.id.split('.');
  const name = rest.length > 0 ? rest.join('.') : item.id;
  return `items/${level}/${slug}/${name}.es.mp3`;
}

export function speechRequest(input: {
  apiUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  text: string;
}): HttpRequest {
  return {
    url: input.apiUrl,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      voice: input.voice,
      input: input.text,
      speed: TTS_SPEED,
      response_format: 'mp3',
    }),
  };
}

export function storageUploadRequest(input: {
  supabaseUrl: string;
  apiKey: string;
  objectPath: string;
}): HttpRequest {
  const base = input.supabaseUrl.replace(/\/+$/, '');
  const encoded = input.objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return {
    url: `${base}/storage/v1/object/${AUDIO_BUCKET}/${encoded}`,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    },
  };
}

/** Set audio.es on raw item rows. Leaves every other field as it was on disk. */
export function applyAudioPaths(raw: unknown, updates: ReadonlyMap<string, string>): unknown {
  if (!Array.isArray(raw)) throw new Error('items file must be an array');
  return raw.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const record = row as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : null;
    const path = id ? updates.get(id) : undefined;
    if (!path) return row;
    const audio =
      record.audio && typeof record.audio === 'object'
        ? (record.audio as Record<string, unknown>)
        : {};
    return { ...record, audio: { ...audio, es: path } };
  });
}
