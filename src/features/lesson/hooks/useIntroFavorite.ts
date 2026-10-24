import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

import { useFavoritesStore } from '@/features/vocab/favoritesStore';

/** Saves the current unit into the local «Избранное» list. */
export function useIntroFavorite(itemId: string) {
  const itemIds = useFavoritesStore((s) => s.itemIds);
  const addFavorite = useFavoritesStore((s) => s.add);
  const saved = itemIds.includes(itemId);

  const save = useCallback(() => {
    if (saved) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addFavorite(itemId);
  }, [addFavorite, itemId, saved]);

  return { saved, save };
}
