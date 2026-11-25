import { stripDiacritics } from '@/features/lesson/grading';

import { pronunciationHints, type PronunciationRuleId } from './rules';

const RULE_KEY: Record<PronunciationRuleId, string> = {
  'silent-h': 'lesson.speechRuleSilentH',
  yeismo: 'lesson.speechRuleYeismo',
  jota: 'lesson.speechRuleJota',
  rr: 'lesson.speechRuleRr',
  stress: 'lesson.speechRuleStress',
};

/** i18n key for the short rule, with ll and y named separately. */
export function tipRuleKey(ruleId: PronunciationRuleId, word: string): string {
  if (ruleId === 'yeismo' && !stripDiacritics(word.toLocaleLowerCase()).includes('ll')) {
    return 'lesson.speechRuleY';
  }
  return RULE_KEY[ruleId];
}

export type SpeechTip = {
  word: string;
  ruleId: PronunciationRuleId;
  /** Learner-letter reading, such as «ЙА-мас». */
  say: string;
};

const RU: Record<string, string> = {
  a: 'а',
  b: 'б',
  c: 'к',
  d: 'д',
  e: 'е',
  f: 'ф',
  g: 'г',
  i: 'и',
  j: 'х',
  k: 'к',
  l: 'л',
  m: 'м',
  n: 'н',
  o: 'о',
  p: 'п',
  q: 'к',
  r: 'р',
  s: 'с',
  t: 'т',
  u: 'у',
  v: 'в',
  w: 'в',
  x: 'кс',
  y: 'й',
  z: 'з',
  ñ: 'нь',
};

const UK: Record<string, string> = { ...RU, i: 'і', y: 'й' };

function lettersFor(language: string): Record<string, string> {
  if (language.startsWith('uk')) return UK;
  if (language.startsWith('en')) return {};
  return RU;
}

function toLearner(plain: string, language: string): string {
  const map = lettersFor(language);
  if (language.startsWith('en')) return plain;
  let out = '';
  for (const char of plain) out += map[char] ?? char;
  return out;
}

/** First syllable in caps, the rest lower, split after a leading «й» + vowel or the first vowel. */
function hyphenate(spelled: string): string {
  const lower = spelled.toLocaleLowerCase();
  const vowel = /[аеіоуыэюяaeiou]/u;
  let cut = 1;
  if (lower.startsWith('й') && vowel.test(lower.charAt(1))) cut = 2;
  else {
    const at = lower.search(vowel);
    cut = at >= 0 ? at + 1 : Math.min(2, lower.length);
  }
  const head = lower.slice(0, cut).toLocaleUpperCase();
  const tail = lower.slice(cut);
  return tail ? `${head}-${tail}` : head;
}

function applyRule(plain: string, ruleId: PronunciationRuleId): string {
  if (ruleId === 'yeismo') return plain.replaceAll('ll', 'й').replaceAll('y', 'й');
  if (ruleId === 'silent-h') return plain.replace(/^h/u, '');
  if (ruleId === 'jota') return plain.replace(/^j/u, 'j').replace(/g(?=[ei])/gu, 'j');
  if (ruleId === 'rr') return plain;
  return plain;
}

export function tipSpelling(word: string, ruleId: PronunciationRuleId, language: string): string {
  const plain = applyRule(stripDiacritics(word.toLocaleLowerCase()), ruleId);
  return hyphenate(toLearner(plain, language));
}

/**
 * Up to two concrete hints for words that were not exact.
 * A rule is used only when it applies to that word.
 */
export function speechTips(
  problems: readonly { expected: string }[],
  language: string,
  limit = 2,
): SpeechTip[] {
  const tips: SpeechTip[] = [];
  const seen = new Set<string>();
  for (const problem of problems) {
    const rules = pronunciationHints(problem.expected).filter((rule) =>
      rule.applies(problem.expected),
    );
    for (const rule of rules) {
      const key = `${problem.expected}:${rule.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tips.push({
        word: problem.expected,
        ruleId: rule.id,
        say: tipSpelling(problem.expected, rule.id, language),
      });
      if (tips.length >= limit) return tips;
    }
  }
  return tips;
}
