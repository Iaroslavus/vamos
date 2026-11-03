import { ACOUSTIC } from './config';

export type DecodedWav = {
  /** Mono PCM in −1…1, resampled to {@link ACOUSTIC.sampleRate}. */
  samples: Float32Array;
  sampleRate: number;
};

const RIFF = 0x46464952;
const WAVE = 0x45564157;
const FMT = 0x20746d66;
const DATA = 0x61746164;

/** Linear interpolation. A matching rate returns the same buffer. */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  if (fromRate <= 0 || toRate <= 0)
    throw new Error('Частота дискретизации должна быть больше нуля.');
  const outLength = Math.max(1, Math.round((samples.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  const scale = fromRate / toRate;
  const last = samples.length - 1;
  for (let index = 0; index < outLength; index += 1) {
    const position = index * scale;
    const left = Math.min(last, Math.floor(position));
    const right = Math.min(last, left + 1);
    const mix = position - left;
    const a = samples[left] ?? 0;
    const b = samples[right] ?? a;
    out[index] = a + (b - a) * mix;
  }
  return out;
}

/**
 * Read a PCM WAV (16-bit integer or 32-bit float), downmix to mono,
 * and resample to 16 kHz. Extra chunks (fact, LIST) are skipped.
 */
export function decodeWavPcm(bytes: Uint8Array): DecodedWav {
  const parsed = parseWav(bytes);
  const samples =
    parsed.sampleRate === ACOUSTIC.sampleRate
      ? parsed.samples
      : resampleLinear(parsed.samples, parsed.sampleRate, ACOUSTIC.sampleRate);
  return { samples, sampleRate: ACOUSTIC.sampleRate };
}

/** 16-bit little-endian mono WAV. Used by tests and the calibration script. */
export function encodeWavPcm16(
  samples: Float32Array,
  sampleRate = ACOUSTIC.sampleRate,
): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  writeFourCC(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeFourCC(view, 8, 'WAVE');
  writeFourCC(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeFourCC(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index] ?? 0));
    const integer = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    view.setInt16(44 + index * 2, integer, true);
  }
  return new Uint8Array(buffer);
}

type ParsedWav = { samples: Float32Array; sampleRate: number };

function parseWav(bytes: Uint8Array): ParsedWav {
  if (bytes.byteLength < 44) throw new Error('WAV короче заголовка.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== RIFF || view.getUint32(8, true) !== WAVE) {
    throw new Error('Файл не WAV.');
  }

  let format: number | null = null;
  let channels = 1;
  let sampleRate: number = ACOUSTIC.sampleRate;
  let bits = 16;
  let dataOffset = -1;
  let dataSize = 0;
  let cursor = 12;
  while (cursor + 8 <= bytes.byteLength) {
    const id = view.getUint32(cursor, true);
    const size = view.getUint32(cursor + 4, true);
    const start = cursor + 8;
    const end = Math.min(bytes.byteLength, start + size);
    if (id === FMT && end >= start + 16) {
      format = view.getUint16(start, true);
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
      bits = view.getUint16(start + 14, true);
    } else if (id === DATA) {
      dataOffset = start;
      dataSize = Math.max(0, Math.min(size, bytes.byteLength - start));
    }
    cursor = start + size + (size % 2);
  }

  if (format !== 1 && format !== 3) throw new Error('WAV должен быть PCM.');
  if (channels < 1 || sampleRate <= 0) throw new Error('В WAV нет каналов или частоты.');
  if (dataOffset < 0 || dataSize <= 0) throw new Error('В WAV нет данных.');
  if (format === 1 && bits !== 16) throw new Error('Целочисленный WAV должен быть 16 бит.');
  if (format === 3 && bits !== 32) throw new Error('Вещественный WAV должен быть 32 бит.');

  const block = Math.max(1, (channels * bits) / 8);
  const frames = Math.floor(dataSize / block);
  const samples = new Float32Array(frames);
  if (format === 3) {
    for (let frame = 0; frame < frames; frame += 1) {
      let sum = 0;
      const base = dataOffset + frame * block;
      for (let channel = 0; channel < channels; channel += 1) {
        sum += view.getFloat32(base + channel * 4, true);
      }
      samples[frame] = sum / channels;
    }
  } else {
    for (let frame = 0; frame < frames; frame += 1) {
      let sum = 0;
      const base = dataOffset + frame * block;
      for (let channel = 0; channel < channels; channel += 1) {
        sum += view.getInt16(base + channel * 2, true) / 0x8000;
      }
      samples[frame] = sum / channels;
    }
  }
  return { samples, sampleRate };
}

function writeFourCC(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < 4; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
}
