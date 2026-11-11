import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  phraseBreakdownFromSwitch,
  rememberOpen,
  rememberSkip,
  type PhraseBreakdownMemory,
} from './phraseBreakdown';

type PhraseBreakdownState = PhraseBreakdownMemory & {
  noteOpen: () => void;
  noteSkip: () => void;
  setShow: (show: boolean) => void;
};

export const usePhraseBreakdownStore = create<PhraseBreakdownState>()(
  persist(
    (set) => ({
      show: false,
      streak: 0,
      noteOpen: () => set((state) => rememberOpen(state)),
      noteSkip: () => set((state) => rememberSkip(state)),
      setShow: (show) => set(phraseBreakdownFromSwitch(show)),
    }),
    {
      name: 'vamos-phrase-breakdown',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ show: state.show, streak: state.streak }),
    },
  ),
);
