import { ACOUSTIC } from './config';
import { mfccFeatures, type FeatureMatrix } from './mfcc';
import { trimSilence } from './signal';

export type VoiceGender = 'female' | 'male';
export type FeatureLocale = 'es-ES' | 'es-MX';

export type VoiceFeatures = {
  locale: FeatureLocale;
  gender: VoiceGender;
  frames: FeatureMatrix;
};

export type UnitFeatures = {
  v: 1;
  sampleRate: number;
  /** Live frames are kept at this step so they sit on the same grid as the voices. */
  stride: number;
  voices: VoiceFeatures[];
};

export type VoiceDraft = {
  locale: FeatureLocale;
  gender: VoiceGender;
  samples: Float32Array;
};

const LOCALE = new Set<string>(['es-ES', 'es-MX']);
const GENDER = new Set<string>(['female', 'male']);

/** `items/<level>/<slug>/<name>.features.json`, beside the normal-speed clips. */
export function featuresObjectPath(item: { id: string; level: string }): string {
  const level = item.level.toLowerCase();
  const [slug, ...rest] = item.id.split('.');
  const name = rest.length > 0 ? rest.join('.') : item.id;
  const folder = slug && slug.length > 0 ? slug : item.id;
  return `items/${level}/${folder}/${name}.features.json`;
}

export function featuresFromSamples(samples: Float32Array): FeatureMatrix {
  return mfccFeatures(trimSilence(samples));
}

function quantize(frames: FeatureMatrix): { scale: number; bytes: Uint8Array; width: number } {
  const width = frames[0]?.length ?? 0;
  let peak = 0;
  for (const frame of frames) {
    for (let index = 0; index < width; index += 1) {
      const value = Math.abs(frame[index] ?? 0);
      if (value > peak) peak = value;
    }
  }
  const scale = peak === 0 ? 1 : peak / 127;
  const bytes = new Uint8Array(frames.length * width);
  let cursor = 0;
  for (const frame of frames) {
    for (let index = 0; index < width; index += 1) {
      const quantized = Math.round((frame[index] ?? 0) / scale);
      bytes[cursor] = Math.max(-127, Math.min(127, quantized)) + 128;
      cursor += 1;
    }
  }
  return { scale, bytes, width };
}

function dequantize(bytes: Uint8Array, width: number, scale: number): FeatureMatrix {
  if (width <= 0 || bytes.length % width !== 0) return [];
  const frames: FeatureMatrix = [];
  for (let offset = 0; offset < bytes.length; offset += width) {
    const row = new Float64Array(width);
    for (let index = 0; index < width; index += 1) {
      row[index] = ((bytes[offset + index] ?? 128) - 128) * scale;
    }
    frames.push(row);
  }
  return frames;
}

export function decimateFrames(frames: FeatureMatrix, stride: number): FeatureMatrix {
  if (stride <= 1) return frames;
  const kept: FeatureMatrix = [];
  for (let index = 0; index < frames.length; index += stride) {
    const frame = frames[index];
    if (frame) kept.push(frame);
  }
  return kept;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    const slice = bytes.subarray(offset, offset + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

type PackedVoice = {
  locale: FeatureLocale;
  gender: VoiceGender;
  scale: number;
  width: number;
  frames: number;
  data: string;
};

function packVoices(voices: readonly VoiceFeatures[], stride: number): string {
  const packed: PackedVoice[] = voices.map((voice) => {
    const frames = decimateFrames(voice.frames, stride);
    const quantized = quantize(frames);
    return {
      locale: voice.locale,
      gender: voice.gender,
      scale: Number(quantized.scale.toFixed(5)),
      width: quantized.width,
      frames: frames.length,
      data: bytesToBase64(quantized.bytes),
    };
  });
  return JSON.stringify({ v: 1, sampleRate: ACOUSTIC.sampleRate, stride, voices: packed });
}

/** Quantized JSON under {@link ACOUSTIC.maxFeatureBytes}. Longer phrases drop frames evenly. */
export function encodeUnitFeatures(voices: readonly VoiceFeatures[]): string {
  if (voices.length === 0) throw new Error('Нет голосов для эталона.');
  for (let stride = 1; stride <= 16; stride += 1) {
    const json = packVoices(voices, stride);
    if (utf8Size(json) < ACOUSTIC.maxFeatureBytes) return json;
  }
  throw new Error('Эталон произношения не укладывается в 10 КБ.');
}

export function encodeDrafts(drafts: readonly VoiceDraft[]): string {
  const voices = drafts.map((draft) => ({
    locale: draft.locale,
    gender: draft.gender,
    frames: featuresFromSamples(draft.samples),
  }));
  if (voices.some((voice) => voice.frames.length === 0)) {
    throw new Error('В записи голоса нет речи для эталона.');
  }
  return encodeUnitFeatures(voices);
}

export function parseUnitFeatures(raw: string): UnitFeatures {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Эталон произношения — не JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Эталон произношения пуст.');
  const record = parsed as Record<string, unknown>;
  if (record.v !== 1) throw new Error('Неизвестная версия эталона.');
  if (!Array.isArray(record.voices) || record.voices.length === 0) {
    throw new Error('В эталоне нет голосов.');
  }
  const voices: VoiceFeatures[] = record.voices.map((entry) => readVoice(entry));
  const sampleRate =
    typeof record.sampleRate === 'number' && record.sampleRate > 0
      ? record.sampleRate
      : ACOUSTIC.sampleRate;
  const stride =
    typeof record.stride === 'number' && record.stride >= 1 ? Math.round(record.stride) : 1;
  return { v: 1, sampleRate, stride, voices };
}

export function tryParseUnitFeatures(raw: string): UnitFeatures | null {
  try {
    return parseUnitFeatures(raw);
  } catch {
    return null;
  }
}

/**
 * Write `audio.features` on the named units.
 * Other audio fields stay as they are. A human recording can still carry a path.
 */
export function applyFeaturesPaths(
  raw: unknown,
  updates: readonly { id: string; path: string }[],
): unknown {
  if (!Array.isArray(raw)) throw new Error('items file must be an array');
  const byId = new Map(updates.map((update) => [update.id, update.path]));
  return raw.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const record = row as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id : '';
    const path = byId.get(id);
    if (!path) return row;
    const audio =
      record.audio && typeof record.audio === 'object'
        ? (record.audio as Record<string, unknown>)
        : {};
    return { ...record, audio: { ...audio, features: path } };
  });
}

function readVoice(entry: unknown): VoiceFeatures {
  if (!entry || typeof entry !== 'object') throw new Error('Голос эталона повреждён.');
  const record = entry as Record<string, unknown>;
  const locale = record.locale;
  const gender = record.gender;
  const scale = record.scale;
  const width = record.width;
  const data = record.data;
  if (typeof locale !== 'string' || !LOCALE.has(locale))
    throw new Error('Неизвестная локаль эталона.');
  if (typeof gender !== 'string' || !GENDER.has(gender)) throw new Error('Неизвестный пол голоса.');
  if (typeof scale !== 'number' || !(scale > 0)) throw new Error('Шкала эталона повреждена.');
  if (typeof width !== 'number' || width <= 0) throw new Error('Ширина эталона повреждена.');
  if (typeof data !== 'string' || data.length === 0) throw new Error('Кадры эталона пусты.');
  const frames = dequantize(base64ToBytes(data), width, scale);
  if (frames.length === 0) throw new Error('Кадры эталона пусты.');
  return { locale: locale as FeatureLocale, gender: gender as VoiceGender, frames };
}

function utf8Size(text: string): number {
  return new TextEncoder().encode(text).length;
}
