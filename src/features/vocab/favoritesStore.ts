import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type FavoritesState = {
  /** Item ids kept before folders existed. The folder repository copies them once. */
  itemIds: string[];
  add: (itemId: string) => void;
  /** Saves every id that is not already in Избранное. */
  addAll: (itemIds: readonly string[]) => void;
  has: (itemId: string) => boolean;
  reset: () => void;
};

/**
 * Legacy local «Избранное». New saves go through the folder repository,
 * which reads this list once and then leaves it alone.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      itemIds: [],

      add: (itemId) => {
        const { itemIds } = get();
        if (itemIds.includes(itemId)) return;
        set({ itemIds: [...itemIds, itemId] });
      },

      addAll: (ids) => {
        const { itemIds } = get();
        const next = [...itemIds];
        for (const id of ids) {
          if (!next.includes(id)) next.push(id);
        }
        if (next.length === itemIds.length) return;
        set({ itemIds: next });
      },

      has: (itemId) => get().itemIds.includes(itemId),

      reset: () => set({ itemIds: [] }),
    }),
    {
      name: 'vamos-favorites',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ itemIds: state.itemIds }),
    },
  ),
);
