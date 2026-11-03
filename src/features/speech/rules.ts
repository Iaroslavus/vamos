import { normalizeForCompare, stripDiacritics } from '@/features/lesson/grading';

import { speechWords } from './score';

export type PronunciationRuleId = 'silent-h' | 'yeismo' | 'jota' | 'stress';

export type PronunciationRule = {
  id: PronunciationRuleId;
  /** i18n key shown when the reference contains this sound. */
  hintKey: string;
  applies: (phrase: string) => boolean;
};

function plain(word: string): string {
  return stripDiacritics(normalizeForCompare(word));
}

/** h at the start of a word is silent. h inside ch is not this rule. */
function hasSilentH(phrase: string): boolean {
  return speechWords(phrase).some((word) => plain(word).startsWith('h'));
}

/** ll and y are the same sound in the Spanish we teach. */
function hasYeismo(phrase: string): boolean {
  return speechWords(phrase).some((word) => {
    const key = plain(word);
    return key.includes('ll') || key.includes('y');
  });
}

/** j, and g before e or i, are the harsh h. */
function hasJota(phrase: string): boolean {
  return speechWords(phrase).some((word) => /j|g[ei]/.test(plain(word)));
}

/** A written accent marks the stressed syllable. */
function hasStressMark(phrase: string): boolean {
  return /[áéíóú]/iu.test(phrase);
}

/** Add a rule here to show another hint when the reference contains that sound. */
export const PRONUNCIATION_RULES: readonly PronunciationRule[] = [
  { id: 'silent-h', hintKey: 'speech.ruleSilentH', applies: hasSilentH },
  { id: 'yeismo', hintKey: 'speech.ruleYeismo', applies: hasYeismo },
  { id: 'jota', hintKey: 'speech.ruleJota', applies: hasJota },
  { id: 'stress', hintKey: 'speech.ruleStress', applies: hasStressMark },
];

export function pronunciationHints(phrase: string): PronunciationRule[] {
  return PRONUNCIATION_RULES.filter((rule) => rule.applies(phrase));
}
