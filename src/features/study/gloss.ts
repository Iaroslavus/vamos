import { getItem } from '@/features/content/loader';
import { textOf } from '@/features/content/text';
import type { UserItem } from '@/features/vocab/types';

export function glossItem(
  itemId: string,
  language: string,
  custom: readonly UserItem[] = [],
): { es: string; tr: string; audio: string | null } {
  const own = custom.find((item) => item.id === itemId);
  if (own) return { es: own.es, tr: own.tr, audio: null };
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
