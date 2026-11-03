import { ACOUSTIC, frameLength, hopLength } from './config';
import { createSpectrumWorkspace, powerSpectrum, type SpectrumWorkspace } from './signal';

export type FeatureMatrix = Float64Array[];

const MEL_BREAK = 700;
const MEL_SCALE = 2595;

type MelBank = {
  weights: Float64Array[];
  start: number[];
  end: number[];
};

let cachedBank: MelBank | null = null;
let cachedDct: Float64Array[] | null = null;

function hzToMel(hz: number): number {
  return MEL_SCALE * Math.log10(1 + hz / MEL_BREAK);
}

function melToHz(mel: number): number {
  return MEL_BREAK * (10 ** (mel / MEL_SCALE) - 1);
}

function melFilterbank(sampleRate: number, fftSize: number, bands: number): MelBank {
  if (
    cachedBank &&
    cachedBank.weights.length === bands &&
    cachedBank.weights[0]?.length === fftSize / 2 + 1
  ) {
    return cachedBank;
  }
  const bins = fftSize / 2 + 1;
  const low = hzToMel(0);
  const high = hzToMel(sampleRate / 2);
  const points = new Float64Array(bands + 2);
  for (let index = 0; index < points.length; index += 1) {
    const hz = melToHz(low + ((high - low) * index) / (bands + 1));
    points[index] = Math.floor((fftSize + 1) * (hz / sampleRate));
  }
  const weights: Float64Array[] = [];
  const start: number[] = [];
  const end: number[] = [];
  for (let band = 1; band <= bands; band += 1) {
    const left = points[band - 1] ?? 0;
    const middle = points[band] ?? 0;
    const right = points[band + 1] ?? 0;
    const row = new Float64Array(bins);
    for (let bin = left; bin < middle; bin += 1) {
      const span = middle - left;
      if (span > 0 && bin >= 0 && bin < bins) row[bin] = (bin - left) / span;
    }
    for (let bin = middle; bin < right; bin += 1) {
      const span = right - middle;
      if (span > 0 && bin >= 0 && bin < bins) row[bin] = (right - bin) / span;
    }
    weights.push(row);
    start.push(Math.max(0, left));
    end.push(Math.min(bins, right));
  }
  cachedBank = { weights, start, end };
  return cachedBank;
}

function dctMatrix(bands: number, count: number): Float64Array[] {
  if (cachedDct && cachedDct.length === count && cachedDct[0]?.length === bands) return cachedDct;
  const rows: Float64Array[] = [];
  const scale = Math.sqrt(2 / bands);
  for (let coefficient = 0; coefficient < count; coefficient += 1) {
    const row = new Float64Array(bands);
    for (let band = 0; band < bands; band += 1) {
      row[band] = scale * Math.cos((Math.PI * coefficient * (band + 0.5)) / bands);
    }
    rows.push(row);
  }
  cachedDct = rows;
  return rows;
}

function preEmphasis(samples: Float32Array, coefficient: number): Float32Array {
  const out = new Float32Array(samples.length);
  if (samples.length === 0) return out;
  out[0] = samples[0] ?? 0;
  for (let index = 1; index < samples.length; index += 1) {
    out[index] = (samples[index] ?? 0) - coefficient * (samples[index - 1] ?? 0);
  }
  return out;
}

function deltas(staticFrames: FeatureMatrix, width: number): FeatureMatrix {
  const window = ACOUSTIC.deltaWindow;
  let denom = 0;
  for (let step = 1; step <= window; step += 1) denom += step * step;
  denom *= 2;
  return staticFrames.map((_, time) => {
    const row = new Float64Array(width);
    for (let step = 1; step <= window; step += 1) {
      const next = staticFrames[Math.min(staticFrames.length - 1, time + step)];
      const prev = staticFrames[Math.max(0, time - step)];
      if (!next || !prev) continue;
      for (let coefficient = 0; coefficient < width; coefficient += 1) {
        row[coefficient] =
          (row[coefficient] ?? 0) + step * ((next[coefficient] ?? 0) - (prev[coefficient] ?? 0));
      }
    }
    for (let coefficient = 0; coefficient < width; coefficient += 1) {
      row[coefficient] = (row[coefficient] ?? 0) / denom;
    }
    return row;
  });
}

/** Per-coefficient mean and variance, so a louder take matches a quieter reference. */
export function cepstralMeanVariance(frames: FeatureMatrix): FeatureMatrix {
  if (frames.length === 0) return [];
  const width = frames[0]?.length ?? 0;
  const mean = new Float64Array(width);
  for (const frame of frames) {
    for (let index = 0; index < width; index += 1) mean[index] += frame[index] ?? 0;
  }
  for (let index = 0; index < width; index += 1) mean[index] /= frames.length;
  const variance = new Float64Array(width);
  for (const frame of frames) {
    for (let index = 0; index < width; index += 1) {
      const delta = (frame[index] ?? 0) - (mean[index] ?? 0);
      variance[index] += delta * delta;
    }
  }
  const scale = new Float64Array(width);
  for (let index = 0; index < width; index += 1) {
    const std = Math.sqrt((variance[index] ?? 0) / frames.length);
    scale[index] = std < 1e-6 ? 1 : std;
  }
  return frames.map((frame) => {
    const row = new Float64Array(width);
    for (let index = 0; index < width; index += 1) {
      row[index] = ((frame[index] ?? 0) - (mean[index] ?? 0)) / (scale[index] ?? 1);
    }
    return row;
  });
}

function staticMfcc(
  samples: Float32Array,
  sampleRate: number,
  workspace: SpectrumWorkspace,
): FeatureMatrix {
  const frame = frameLength(sampleRate);
  const hop = hopLength(sampleRate);
  const bank = melFilterbank(sampleRate, ACOUSTIC.fftSize, ACOUSTIC.melBands);
  const dct = dctMatrix(ACOUSTIC.melBands, ACOUSTIC.mfccCount);
  const emphasized = preEmphasis(samples, ACOUSTIC.preEmphasis);
  const frames: FeatureMatrix = [];
  const logMel = new Float64Array(ACOUSTIC.melBands);
  for (let start = 0; start + frame <= emphasized.length; start += hop) {
    const power = powerSpectrum(emphasized.subarray(start, start + frame), workspace);
    for (let band = 0; band < bank.weights.length; band += 1) {
      const weights = bank.weights[band];
      const from = bank.start[band] ?? 0;
      const to = bank.end[band] ?? 0;
      let energy = 0;
      if (weights) {
        for (let bin = from; bin < to; bin += 1) energy += (power[bin] ?? 0) * (weights[bin] ?? 0);
      }
      logMel[band] = Math.log(Math.max(energy, 1e-10));
    }
    const coefficients = new Float64Array(ACOUSTIC.mfccCount);
    for (let coefficient = 0; coefficient < dct.length; coefficient += 1) {
      const row = dct[coefficient];
      let sum = 0;
      if (row) {
        for (let band = 0; band < row.length; band += 1)
          sum += (row[band] ?? 0) * (logMel[band] ?? 0);
      }
      coefficients[coefficient] = sum;
    }
    frames.push(coefficients);
  }
  return frames;
}

/**
 * 13 MFCC plus deltas, then CMVN across the utterance.
 * Each frame is 26 numbers.
 */
export function mfccFeatures(
  samples: Float32Array,
  sampleRate = ACOUSTIC.sampleRate,
): FeatureMatrix {
  if (samples.length < frameLength(sampleRate)) return [];
  const workspace = createSpectrumWorkspace(frameLength(sampleRate));
  const staticFrames = staticMfcc(samples, sampleRate, workspace);
  if (staticFrames.length === 0) return [];
  const delta = deltas(staticFrames, ACOUSTIC.mfccCount);
  const joined = staticFrames.map((frame, index) => {
    const row = new Float64Array(ACOUSTIC.mfccCount * 2);
    row.set(frame, 0);
    const slope = delta[index];
    if (slope) row.set(slope, ACOUSTIC.mfccCount);
    return row;
  });
  return cepstralMeanVariance(joined);
}
