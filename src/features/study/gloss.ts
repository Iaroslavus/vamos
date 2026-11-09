import { getItem } from '@/features/content/loader';
import { textOf } from '@/features/content/text';

export function glossItem(
  itemId: string,
  language: string,
): { es: string; tr: string; audio: string | null } {
  try {
    const item = getItem(itemId);
    return {
      es: item.es,
      tr: textOf(item.tr, language),
      audio: item.audio.es,
    };
  } catch {
    return { es: itemId, tr: '', audio: null };
  }
}
