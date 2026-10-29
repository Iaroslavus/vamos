import type { Item } from './schema';
import { CONTENT_LOCALES, type ContentLocale } from './text';

const PUNCTUATION = /[¿¡?!.,;:«»"()[\]—–-]/g;

/** Case and punctuation folded, so «Добрые дни» and «добрые дни» compare equal. */
export function normalizeGloss(text: string): string {
  return text.toLowerCase().replace(PUNCTUATION, ' ').replace(/\s+/g, ' ').trim();
}

export function sameGloss(left: string, right: string): boolean {
  return normalizeGloss(left) === normalizeGloss(right);
}

/** Space-joined `parts[].tr` for one learner language. */
export function glossGlue(item: Item, locale: ContentLocale): string {
  return item.parts
    .map((part) => part.tr[locale] ?? '')
    .filter((part) => part.length > 0)
    .join(' ');
}

/**
 * A phrase whose word-for-word reading differs from `tr`, but whose part glosses
 * still rebuild that natural translation. That is a sense gloss, not a literal one.
 */
export function literalPartWarnings(item: Item): string[] {
  if (!item.literal || item.parts.length === 0) return [];
  const warnings: string[] = [];
  for (const locale of CONTENT_LOCALES) {
    const wordForWord = item.literal[locale];
    const natural = item.tr[locale];
    if (!wordForWord || !natural) continue;
    if (sameGloss(wordForWord, natural)) continue;
    if (sameGloss(glossGlue(item, locale), natural)) {
      warnings.push(
        `item ${item.id} ${locale}: склейка parts[].tr совпадает с tr, хотя дословный перевод отличается`,
      );
    }
  }
  return warnings;
}
