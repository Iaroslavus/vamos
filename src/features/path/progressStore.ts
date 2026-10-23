import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type PathProgressState = {
  completedIds: string[];
  /** Total XP kept in this local cache. The home path reads the progress repository. */
  totalXp: number;
  markComplete: (lessonId: string, xpEarned?: number) => void;
  isComplete: (lessonId: string) => boolean;
  resetProgress: () => void;
};

export const usePathProgressStore = create<PathProgressState>()(
  persist(
    (set, get) => ({
      completedIds: [],
      totalXp: 0,

      markComplete: (lessonId, xpEarned = 0) => {
        const { completedIds, totalXp } = get();
        if (completedIds.includes(lessonId)) {
          if (xpEarned > 0) {
            set({ totalXp: totalXp + xpEarned });
          }
          return;
        }
        set({
          completedIds: [...completedIds, lessonId],
          totalXp: totalXp + Math.max(0, xpEarned),
        });
      },

      isComplete: (lessonId) => get().completedIds.includes(lessonId),

      resetProgress: () => set({ completedIds: [], totalXp: 0 }),
    }),
    {
      name: 'vamos-path-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        completedIds: state.completedIds,
        totalXp: state.totalXp,
      }),
    },
  ),
);
