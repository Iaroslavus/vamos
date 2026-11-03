import { ACOUSTIC, frameLength, hopLength } from './config';
import { fft } from './fft';

export type SpectrumWorkspace = {
  real: Float64Array;
  imag: Float64Array;
  window: Float64Array;
  power: Float64Array;
};

export function createSpectrumWorkspace(
  frame: number,
  fftSize = ACOUSTIC.fftSize,
): SpectrumWorkspace {
  const window = new Float64Array(frame);
  const denom = Math.max(1, frame - 1);
  for (let index = 0; index < frame; index += 1) {
    window[index] = 0.54 - 0.46 * Math.cos((2 * Math.PI * index) / denom);
  }
  return {
    real: new Float64Array(fftSize),
    imag: new Float64Array(fftSize),
    window,
    power: new Float64Array(fftSize / 2 + 1),
  };
}

/** Power of bins 0…N/2. The workspace is reused by the caller. */
export function powerSpectrum(
  frame: ArrayLike<number>,
  workspace: SpectrumWorkspace,
): Float64Array {
  const { real, imag, window } = workspace;
  real.fill(0);
  imag.fill(0);
  const length = Math.min(frame.length, window.length, real.length);
  for (let index = 0; index < length; index += 1) {
    real[index] = (frame[index] ?? 0) * (window[index] ?? 1);
  }
  fft(real, imag);
  const bins = real.length / 2;
  const power = workspace.power;
  for (let bin = 0; bin <= bins; bin += 1) {
    const re = real[bin] ?? 0;
    const im = imag[bin] ?? 0;
    power[bin] = re * re + im * im;
  }
  return power;
}

export function zeroCrossingRate(frame: ArrayLike<number>): number {
  let crosses = 0;
  let previous = frame[0] ?? 0;
  const last = frame.length;
  for (let index = 1; index < last; index += 1) {
    const next = frame[index] ?? 0;
    if ((previous >= 0 && next < 0) || (previous < 0 && next >= 0)) crosses += 1;
    previous = next;
  }
  return crosses / Math.max(1, last - 1);
}

/** Share of spectral energy at or above the cutoff. */
export function highFrequencyShare(
  frame: ArrayLike<number>,
  sampleRate: number,
  workspace: SpectrumWorkspace,
  cutoffHz = ACOUSTIC.hfCutoffHz,
): number {
  const power = powerSpectrum(frame, workspace);
  const bins = power.length - 1;
  let total = 0;
  let high = 0;
  for (let bin = 1; bin <= bins; bin += 1) {
    const value = power[bin] ?? 0;
    const hz = (bin * sampleRate) / workspace.real.length;
    total += value;
    if (hz >= cutoffHz) high += value;
  }
  if (total <= 1e-12) return 0;
  return high / total;
}

export function frameEnergy(frame: ArrayLike<number>): number {
  let sum = 0;
  for (let index = 0; index < frame.length; index += 1) {
    const sample = frame[index] ?? 0;
    sum += sample * sample;
  }
  return sum / Math.max(1, frame.length);
}

/**
 * Drop leading and trailing silence.
 * A quiet take returns an empty buffer so the score does not invent speech.
 */
export function trimSilence(samples: Float32Array, sampleRate = ACOUSTIC.sampleRate): Float32Array {
  const frame = frameLength(sampleRate);
  const hop = hopLength(sampleRate);
  if (samples.length < frame) return new Float32Array(0);
  const energies: number[] = [];
  for (let start = 0; start + frame <= samples.length; start += hop) {
    energies.push(frameEnergy(samples.subarray(start, start + frame)));
  }
  let peak = 0;
  for (const energy of energies) if (energy > peak) peak = energy;
  if (peak < ACOUSTIC.silenceAbsolute) return new Float32Array(0);
  const threshold = Math.max(ACOUSTIC.silenceAbsolute, peak * ACOUSTIC.energyRatio);
  let first = -1;
  let last = -1;
  for (let index = 0; index < energies.length; index += 1) {
    if ((energies[index] ?? 0) < threshold) continue;
    if (first < 0) first = index;
    last = index;
  }
  if (first < 0 || last < 0) return new Float32Array(0);
  first = Math.max(0, first - ACOUSTIC.energyPadFrames);
  last = Math.min(energies.length - 1, last + ACOUSTIC.energyPadFrames);
  const start = first * hop;
  const end = Math.min(samples.length, last * hop + frame);
  return samples.slice(start, end);
}

export function isNoiseFrame(
  frame: ArrayLike<number>,
  sampleRate: number,
  workspace: SpectrumWorkspace,
): boolean {
  return (
    zeroCrossingRate(frame) >= ACOUSTIC.zcrNoise &&
    highFrequencyShare(frame, sampleRate, workspace) >= ACOUSTIC.hfShare
  );
}

/**
 * Milliseconds of fricative noise before the first vowel-like frame.
 * Silence is ignored. The clock stops at the first frame that is not noise.
 */
export function noiseBeforeVowelMs(
  samples: Float32Array,
  sampleRate = ACOUSTIC.sampleRate,
): number {
  const frame = frameLength(sampleRate);
  const hop = hopLength(sampleRate);
  if (samples.length < frame) return 0;
  const workspace = createSpectrumWorkspace(frame);
  const floor = ACOUSTIC.silenceAbsolute;
  let noiseFrames = 0;
  for (let start = 0; start + frame <= samples.length; start += hop) {
    const slice = samples.subarray(start, start + frame);
    if (frameEnergy(slice) < floor) continue;
    if (!isNoiseFrame(slice, sampleRate, workspace)) break;
    noiseFrames += 1;
  }
  return noiseFrames * ACOUSTIC.hopMs;
}
