import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/useSession';

import { vocabRepository } from '../defaultRepository';

export type ItemSaveState = {
  inFavorites: boolean;
  inAny: boolean;
  reload: () => void;
};

/** Whether these items already sit in Избранное or in any folder the learner edits. */
export function useItemSaveState(itemIds: readonly string[]): ItemSaveState {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const key = itemIds.join('|');
  const [state, setState] = useState({ inFavorites: false, inAny: false });

  const reload = useCallback(() => {
    if (!userId || key.length === 0) return;
    const ids = key.split('|');
    void vocabRepository
      .read(userId)
      .then((snapshot) => {
        const favorites = snapshot.folders.find((folder) => folder.systemKey === 'favorites');
        const editable = new Set(
          snapshot.folders
            .filter((folder) => folder.systemKey !== 'difficult')
            .map((folder) => folder.id),
        );
        setState({
          inFavorites: holds(snapshot.items, favorites?.id, ids),
          inAny: ids.every((id) =>
            snapshot.items.some((item) => item.itemId === id && editable.has(item.folderId)),
          ),
        });
      })
      .catch(() => setState({ inFavorites: false, inAny: false }));
  }, [key, userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!userId || key.length === 0) return { inFavorites: false, inAny: false, reload };
  return { ...state, reload };
}

function holds(
  items: readonly { folderId: string; itemId: string }[],
  folderId: string | undefined,
  itemIds: readonly string[],
): boolean {
  if (!folderId || itemIds.length === 0) return false;
  return itemIds.every((id) =>
    items.some((item) => item.folderId === folderId && item.itemId === id),
  );
}
