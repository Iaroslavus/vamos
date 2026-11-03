import { ACOUSTIC } from './config';
import { bestSimilarity } from './dtw';
import { mfccFeatures } from './mfcc';
import { decimateFrames, type UnitFeatures } from './reference';
import { acousticFindings, errorFindings, type AcousticFinding } from './rules';
import { noiseBeforeVowelMs, trimSilence } from './signal';

export type AcousticAssessment = {
  /** Best voice, 0–100. Null when this take has no reference to compare. */
  similarity: number | null;
  noiseBeforeVowelMs: number;
  findings: AcousticFinding[];
  /** Points removed for error rules. Expected sounds do not change the score. */
  penalty: number;
};

/**
 * Score one take against every stored voice and run the point checks.
 * References are already CMVN'd MFCC. The take is normalized on its own.
 */
export function assessRecording(
  samples: Float32Array,
  references: UnitFeatures | null,
  phrase: string,
): AcousticAssessment {
  const speech = trimSilence(samples);
  const noiseMs = noiseBeforeVowelMs(speech);
  const findings = acousticFindings(phrase, { noiseBeforeVowelMs: noiseMs });
  const penalty = errorFindings(findings).length * ACOUSTIC.rulePenalty;
  if (!references || references.voices.length === 0) {
    return { similarity: null, noiseBeforeVowelMs: noiseMs, findings, penalty };
  }
  const live = decimateFrames(mfccFeatures(speech), references.stride);
  const similarity =
    live.length === 0
      ? 0
      : bestSimilarity(
          live,
          references.voices.map((voice) => voice.frames),
        );
  return { similarity, noiseBeforeVowelMs: noiseMs, findings, penalty };
}

/**
 * Final grade. Missing acoustics leave the text score untouched.
 * Weights live in {@link ACOUSTIC}.
 */
export function combinePronunciationScore(
  textScore: number,
  acousticScore: number | null,
  penalty = 0,
): number {
  const text = clampScore(textScore);
  const acoustic = acousticScore === null ? null : clampScore(acousticScore);
  const weight = ACOUSTIC.textWeight + ACOUSTIC.acousticWeight;
  const mixed =
    acoustic === null
      ? text
      : Math.round((ACOUSTIC.textWeight * text + ACOUSTIC.acousticWeight * acoustic) / weight);
  return clampScore(mixed - penalty);
}

export function passesAcoustic(score: number): boolean {
  return score >= ACOUSTIC.passScore;
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
