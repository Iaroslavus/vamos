import { contentLanguage } from '@/features/content/language';
import { getItem } from '@/features/content/loader';
import { textOf } from '@/features/content/text';

export type SpeakExtras = {
  sayRu: string | null;
  parts: { es: string; ru: string }[];
  confusables: string[];
  featuresPath: string | null;
};

const EMPTY: SpeakExtras = {
  sayRu: null,
  parts: [],
  confusables: [],
  featuresPath: null,
};

/** Pronunciation hints for one unit. A missing catalog item still lets the learner speak. */
export function speakExtras(itemId: string): SpeakExtras {
  try {
    const item = getItem(itemId);
    const say = textOf(item.say, contentLanguage());
    return {
      sayRu: say || null,
      parts: item.parts.map((part) => ({ es: part.es, ru: textOf(part.tr, contentLanguage()) })),
      confusables: [...item.confusables],
      featuresPath: item.audio.features,
    };
  } catch {
    return EMPTY;
  }
}
