import { useCallback, useState } from 'react';

import { usePhraseBreakdownStore } from '@/features/settings/phraseBreakdownStore';

type CardMemory = {
  id: string;
  /** null follows the profile setting. */
  chosen: boolean | null;
  opened: boolean;
};

/**
 * Closed until «Детальніше», unless the profile setting is on.
 * Three opens in a row turn that setting on. Next without opening resets the streak.
 */
export function useIntroBreakdown(itemId: string, hasBreakdown: boolean, onNext: () => void) {
  const show = usePhraseBreakdownStore((state) => state.show);
  const noteOpen = usePhraseBreakdownStore((state) => state.noteOpen);
  const noteSkip = usePhraseBreakdownStore((state) => state.noteSkip);
  const [memory, setMemory] = useState<CardMemory>(() => ({
    id: itemId,
    chosen: null,
    opened: show,
  }));

  if (memory.id !== itemId) {
    setMemory({ id: itemId, chosen: null, opened: show });
  }

  const toggle = useCallback(() => {
    setMemory((current) => {
      const onThisCard = current.id === itemId;
      const openNow = onThisCard
        ? (current.chosen ?? usePhraseBreakdownStore.getState().show)
        : usePhraseBreakdownStore.getState().show;
      const next = !openNow;
      const opened = onThisCard ? current.opened : usePhraseBreakdownStore.getState().show;
      if (next && !opened) noteOpen();
      return { id: itemId, chosen: next, opened: opened || next };
    });
  }, [itemId, noteOpen]);

  const onThisCard = memory.id === itemId;
  const opened = onThisCard ? memory.opened : show;
  const chosen = onThisCard ? memory.chosen : null;

  const goNext = useCallback(() => {
    if (hasBreakdown && !opened) noteSkip();
    onNext();
  }, [hasBreakdown, noteSkip, onNext, opened]);

  return { expanded: (chosen ?? show) && hasBreakdown, toggle, goNext };
}
