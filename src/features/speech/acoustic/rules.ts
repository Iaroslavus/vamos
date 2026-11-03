import { normalizeForCompare, stripDiacritics } from '@/features/lesson/grading';

import { ACOUSTIC } from './config';
import { speechWords } from '../score';

export type AcousticRuleId = 'silent-h' | 'jota';

export type AcousticFinding = {
  id: AcousticRuleId;
  /** i18n key. Errors are shown after the take; expected sounds are for calibration. */
  hintKey: string;
  kind: 'error' | 'expected';
};

export type OnsetCue = {
  noiseBeforeVowelMs: number;
};

/**
 * One point check. Add a rule here to flag another sound.
 * `kind: "expected"` records a sound the detector should allow, not a mistake.
 */
export type AcousticRule = {
  id: AcousticRuleId;
  hintKey: string;
  kind: 'error' | 'expected';
  applies(phrase: string): boolean;
  matches(cue: OnsetCue): boolean;
};

const VOWEL = /^[aeiouáéíóúü]/u;

function plain(word: string): string {
  return stripDiacritics(normalizeForCompare(word));
}

function firstWord(phrase: string): string {
  return speechWords(phrase)[0] ?? '';
}

/** Word-initial h is silent. h inside ch is not this check. */
export function startsWithSilentH(phrase: string): boolean {
  return plain(firstWord(phrase)).startsWith('h');
}

/** The first sound is a vowel, so a puff of air before it is an extra h. */
export function startsWithVowel(phrase: string): boolean {
  return VOWEL.test(plain(firstWord(phrase)));
}

/** j, or g before e/i, is the velar fricative. That noise is the consonant, not an h. */
export function expectsVelarFricative(phrase: string): boolean {
  return /^j|g[ei]/.test(plain(firstWord(phrase)));
}

function noiseIsLong(cue: OnsetCue): boolean {
  return cue.noiseBeforeVowelMs > ACOUSTIC.noiseBeforeVowelMs;
}

export const ACOUSTIC_RULES: readonly AcousticRule[] = [
  {
    id: 'jota',
    hintKey: 'speech.ruleJota',
    kind: 'expected',
    applies: expectsVelarFricative,
    matches: noiseIsLong,
  },
  {
    id: 'silent-h',
    hintKey: 'speech.acousticSilentH',
    kind: 'error',
    applies(phrase) {
      if (expectsVelarFricative(phrase)) return false;
      return startsWithSilentH(phrase) || startsWithVowel(phrase);
    },
    matches: noiseIsLong,
  },
];

/** Rules whose conditions matched this onset, in registry order. */
export function acousticFindings(phrase: string, cue: OnsetCue): AcousticFinding[] {
  const findings: AcousticFinding[] = [];
  for (const rule of ACOUSTIC_RULES) {
    if (!rule.applies(phrase) || !rule.matches(cue)) continue;
    findings.push({ id: rule.id, hintKey: rule.hintKey, kind: rule.kind });
  }
  return findings;
}

export function errorFindings(findings: readonly AcousticFinding[]): AcousticFinding[] {
  return findings.filter((finding) => finding.kind === 'error');
}
