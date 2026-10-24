import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type FavoritesState = {
  /** Item ids kept in the local «Избранное» folder until real folders exist. */
  itemIds: string[];
  add: (itemId: string) => void;
  has: (itemId: string) => boolean;
  reset: () => void;
};

/**
 * Local «Избранное». Folder screens and the add-to-folder sheet come later;
 * this only remembers which units the learner saved from a card.
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
