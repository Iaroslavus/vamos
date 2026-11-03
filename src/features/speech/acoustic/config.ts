/**
 * Thresholds and score weights for on-device pronunciation.
 * The calibration script prints the same numbers so they can be tuned on real takes.
 */
export const ACOUSTIC = {
  sampleRate: 16_000,
  frameMs: 25,
  hopMs: 10,
  fftSize: 512,
  melBands: 26,
  mfccCount: 13,
  /** Lifter-free pre-emphasis. */
  preEmphasis: 0.97,
  deltaWindow: 2,
  /** Frames below this fraction of the peak are silence. */
  energyRatio: 0.045,
  /** Mean-square floor. Digital silence stays silence even when the peak is tiny. */
  silenceAbsolute: 1e-7,
  energyPadFrames: 2,
  /** A noise frame needs both a high zero-crossing rate and a high share of HF energy. */
  zcrNoise: 0.18,
  hfShare: 0.35,
  hfCutoffHz: 2_500,
  /** Aspiration before the first vowel longer than this is "h" that should be silent. */
  noiseBeforeVowelMs: 45,
  /** Sakoe-Chiba band as a fraction of the longer sequence. Wide enough for a 2× stretch. */
  dtwBand: 0.4,
  /**
   * Average squared distance that maps to about 37 similarity.
   * Identical sequences stay at 100.
   */
  dtwScale: 14,
  /** Text check from the strict word scorer. */
  textWeight: 0.55,
  /** Best DTW similarity against the reference voices. */
  acousticWeight: 0.45,
  /** Subtracted once for each fired error rule. */
  rulePenalty: 15,
  passScore: 70,
  /** Compact reference JSON, per unit, strict. */
  maxFeatureBytes: 10_000,
} as const;

export function frameLength(sampleRate: number = ACOUSTIC.sampleRate): number {
  return Math.round((sampleRate * ACOUSTIC.frameMs) / 1000);
}

export function hopLength(sampleRate: number = ACOUSTIC.sampleRate): number {
  return Math.round((sampleRate * ACOUSTIC.hopMs) / 1000);
}
