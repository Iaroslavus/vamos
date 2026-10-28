import { AUDIO_BUCKET } from '@/features/audio/storage';
import {
  isStoredAudioPath,
  voicesForVariant,
  type AudioPreference,
  type AudioSpeed,
} from '@/features/audio/select';

import type { Item } from '../schema';

export type { TtsHttpRequest as HttpRequest } from './ttsProviders';

export type PlannedClip = {
  itemId: string;
  text: string;
  partIndex: number | null;
  voice: AudioPreference;
  locale: 'es-ES' | 'es-MX';
  speed: AudioSpeed;
  objectPath: string;
};

export type AudioPathUpdate = {
  id: string;
  partIndex: number | null;
  voice: AudioPreference;
  speed: AudioSpeed;
  path: string;
};

const SPEEDS: readonly AudioSpeed[] = ['normal', 'slow'];

export function needsGeneratedAudio(item: Item): boolean {
  return planItemClips(item).length > 0;
}

/** `items/<level>/<slug>/<name>[.pN].<es|mx>.<normal|slow>.m4a` */
export function audioObjectPath(
  item: Pick<Item, 'id' | 'level'>,
  clip: { partIndex: number | null; voice: AudioPreference; speed: AudioSpeed },
): string {
  const level = item.level.toLowerCase();
  const [slug, ...rest] = item.id.split('.');
  const name = rest.length > 0 ? rest.join('.') : item.id;
  const part = clip.partIndex === null ? '' : `.p${clip.partIndex}`;
  const voice = clip.voice === 'es' ? 'es' : 'mx';
  return `items/${level}/${slug}/${name}${part}.${voice}.${clip.speed}.m4a`;
}

/**
 * Clips still missing for this unit.
 * A narrator recording (`source: "human"`) is left untouched, even when a slot is empty.
 */
export function planItemClips(item: Item): PlannedClip[] {
  if (item.audio.source === 'human') return [];
  const planned: PlannedClip[] = [];
  const voices = voicesForVariant(item.variant);
  const slots: { partIndex: number | null; text: string }[] = [
    { partIndex: null, text: item.es },
    ...item.parts.map((part, index) => ({ partIndex: index, text: part.es })),
  ];
  for (const slot of slots) {
    for (const voice of voices) {
      for (const speed of SPEEDS) {
        const existing = existingPath(item, slot.partIndex, voice, speed);
        if (isStoredAudioPath(existing)) continue;
        planned.push({
          itemId: item.id,
          text: slot.text,
          partIndex: slot.partIndex,
          voice,
          locale: voice === 'es' ? 'es-ES' : 'es-MX',
          speed,
          objectPath: audioObjectPath(item, { partIndex: slot.partIndex, voice, speed }),
        });
      }
    }
  }
  return planned;
}

function existingPath(
  item: Item,
  partIndex: number | null,
  voice: AudioPreference,
  speed: AudioSpeed,
): string | null {
  const track = partIndex === null ? item.audio : item.audio.parts[partIndex];
  if (!track) return null;
  const pair = speed === 'slow' ? track.slow : track;
  return pair[voice] ?? null;
}

export function storageUploadRequest(input: {
  supabaseUrl: string;
  apiKey: string;
  objectPath: string;
}): { url: string; headers: Record<string, string> } {
  const base = input.supabaseUrl.replace(/\/+$/, '');
  const encoded = input.objectPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return {
    url: `${base}/storage/v1/object/${AUDIO_BUCKET}/${encoded}`,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'audio/mp4',
      'x-upsert': 'true',
    },
  };
}

type SpeedPair = { es: string | null; latam: string | null };
type Track = SpeedPair & { slow: SpeedPair };

function asPath(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asPair(value: unknown): SpeedPair {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return { es: asPath(record.es), latam: asPath(record.latam) };
}

function asTrack(value: unknown): Track {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return { ...asPair(record), slow: asPair(record.slow) };
}

function writeClip(track: Track, voice: AudioPreference, speed: AudioSpeed, path: string): void {
  if (speed === 'slow') track.slow[voice] = path;
  else track[voice] = path;
}

/**
 * Merge generated paths into raw item rows.
 * Rows marked `source: "human"` are returned unchanged.
 */
export function applyAudioPaths(raw: unknown, updates: readonly AudioPathUpdate[]): unknown {
  if (!Array.isArray(raw)) throw new Error('items file must be an array');
  const byId = new Map<string, AudioPathUpdate[]>();
  for (const update of updates) {
    const list = byId.get(update.id) ?? [];
    list.push(update);
    byId.set(update.id, list);
  }
  return raw.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const record = row as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : null;
    const list = id ? byId.get(id) : undefined;
    if (!list || list.length === 0) return row;
    const audio =
      record.audio && typeof record.audio === 'object'
        ? (record.audio as Record<string, unknown>)
        : {};
    if (audio.source === 'human') return row;
    const phrase = asTrack(audio);
    const parts = Array.isArray(audio.parts) ? audio.parts.map((part) => asTrack(part)) : [];
    for (const update of list) {
      if (update.partIndex === null) {
        writeClip(phrase, update.voice, update.speed, update.path);
        continue;
      }
      while (parts.length <= update.partIndex) parts.push(asTrack(null));
      const part = parts[update.partIndex];
      if (part) writeClip(part, update.voice, update.speed, update.path);
    }
    return {
      ...record,
      audio: {
        source: 'tts',
        es: phrase.es,
        latam: phrase.latam,
        slow: phrase.slow,
        parts,
      },
    };
  });
}
