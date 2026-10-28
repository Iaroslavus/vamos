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

/** Slow clip must be at least this many times the normal clip of the same unit. */
export const SLOW_MIN_DURATION_RATIO = 1.2;

export type PlanClipOptions = {
  /** Plan slow clips only. Normal files already on the unit stay as they are. */
  onlySlow?: boolean;
  /** Plan a clip even when a stored path is already written. */
  force?: boolean;
};

export type TtsCliOptions = {
  onlySlow: boolean;
  force: boolean;
};

/** `--only-slow` regenerates slow clips. `--force` replaces paths that already exist. */
export function parseTtsArgs(argv: readonly string[]): TtsCliOptions {
  const options: TtsCliOptions = { onlySlow: false, force: false };
  for (const arg of argv) {
    if (arg === '--only-slow') options.onlySlow = true;
    else if (arg === '--force') options.force = true;
    else throw new Error(`Неизвестный аргумент ${arg}`);
  }
  return options;
}

export function needsGeneratedAudio(item: Item): boolean {
  return planItemClips(item).length > 0;
}

/**
 * Slow must be at least {@link SLOW_MIN_DURATION_RATIO} times the normal clip.
 * The error names the unit so a bad synthesis can be found in the log.
 */
export function assertSlowLongerThanNormal(
  itemId: string,
  normalSeconds: number,
  slowSeconds: number,
): void {
  const ratio =
    normalSeconds > 0 && Number.isFinite(normalSeconds) && Number.isFinite(slowSeconds)
      ? slowSeconds / normalSeconds
      : 0;
  if (ratio + 1e-6 >= SLOW_MIN_DURATION_RATIO) return;
  const normalLabel = Number.isFinite(normalSeconds) ? normalSeconds.toFixed(2) : '?';
  const slowLabel = Number.isFinite(slowSeconds) ? slowSeconds.toFixed(2) : '?';
  throw new Error(
    `Единица ${itemId}: медленная запись (${slowLabel} с) короче, чем ${SLOW_MIN_DURATION_RATIO}× обычной (${normalLabel} с).`,
  );
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
export function planItemClips(item: Item, options: PlanClipOptions = {}): PlannedClip[] {
  if (item.audio.source === 'human') return [];
  const planned: PlannedClip[] = [];
  const voices = voicesForVariant(item.variant);
  const slots: { partIndex: number | null; text: string }[] = [
    { partIndex: null, text: item.es },
    ...item.parts.map((part, index) => ({ partIndex: index, text: part.es })),
  ];
  const speeds = options.onlySlow ? (['slow'] as const) : SPEEDS;
  for (const slot of slots) {
    for (const voice of voices) {
      for (const speed of speeds) {
        const existing = existingPath(item, slot.partIndex, voice, speed);
        if (!options.force && isStoredAudioPath(existing)) continue;
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

/** Path already stored for this slot, if any. */
export function clipPath(
  item: Item,
  partIndex: number | null,
  voice: AudioPreference,
  speed: AudioSpeed,
): string | null {
  return existingPath(item, partIndex, voice, speed);
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

/**
 * MIME types stored on the `audio` bucket.
 * Keep this list identical to `allowed_mime_types` in
 * `supabase/migrations/20261028180000_audio_bucket_mime.sql`.
 */
export const AUDIO_BUCKET_MIME_TYPES = [
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/mpeg',
] as const;

/** `.m4a` is audio/mp4, `.mp3` is audio/mpeg. Both are on the bucket allow-list. */
export function audioUploadContentType(objectPath: string): 'audio/mp4' | 'audio/mpeg' {
  const normalized = objectPath.toLowerCase();
  if (normalized.endsWith('.m4a')) return 'audio/mp4';
  if (normalized.endsWith('.mp3')) return 'audio/mpeg';
  throw new Error(`Для загрузки нужен файл .m4a или .mp3: ${objectPath}`);
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
  const contentType = audioUploadContentType(input.objectPath);
  return {
    url: `${base}/storage/v1/object/${AUDIO_BUCKET}/${encoded}`,
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': contentType,
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
