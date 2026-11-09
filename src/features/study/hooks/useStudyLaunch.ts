import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFolders } from '@/features/vocab/hooks/useFolders';

import { glossItem } from '../gloss';
import { useReviewSnapshot } from '../hooks/useReviewSnapshot';
import { useStudyPrefs } from '../hooks/useStudyPrefs';
import { isPlayableStudyMode } from '../modes';
import { buildStudyUnits, sessionPlan } from '../sessionPlan';
import type { StudyMode, StudyStep } from '../types';

export type StudyLaunchStatus =
  'loading' | 'error' | 'missing' | 'unavailable' | 'empty' | 'invalid' | 'ready';

export function useStudyLaunch(folderId: string, mode: StudyMode | null) {
  const { i18n } = useTranslation();
  const vocab = useFolders();
  const review = useReviewSnapshot(vocab.userId);
  const prefs = useStudyPrefs(vocab.userId, folderId);
  const now = useMemo(() => new Date(), []);

  const itemIds = useMemo(() => {
    const items = vocab.snapshot?.items ?? [];
    return items.filter((item) => item.folderId === folderId).map((item) => item.itemId);
  }, [folderId, vocab.snapshot]);

  const units = useMemo(
    () =>
      buildStudyUnits({
        itemIds,
        cards: review.data?.cards ?? [],
        now,
        gloss: (id) => glossItem(id, i18n.language),
      }),
    [i18n.language, itemIds, now, review.data],
  );

  const steps = useMemo(() => {
    if (!mode || !prefs.ready) return [] as StudyStep[];
    return sessionPlan(mode, units, prefs.prefs.settings);
  }, [mode, prefs.prefs.settings, prefs.ready, units]);

  const folder = vocab.snapshot?.folders.find((entry) => entry.id === folderId) ?? null;
  const waiting = vocab.isPending || !prefs.ready || (vocab.userId != null && review.isPending);

  return {
    status: launchStatus({
      mode,
      waiting,
      folderMissing: vocab.isSuccess && !folder,
      failed: vocab.isError || review.isError,
      empty: steps.length === 0,
    }),
    steps,
    userId: vocab.userId,
    reload: () => {
      void vocab.refetch();
      void review.refetch();
    },
  };
}

function launchStatus(input: {
  mode: StudyMode | null;
  waiting: boolean;
  folderMissing: boolean;
  failed: boolean;
  empty: boolean;
}): StudyLaunchStatus {
  if (!input.mode) return 'invalid';
  if (!isPlayableStudyMode(input.mode)) return 'unavailable';
  if (input.failed) return 'error';
  if (input.waiting) return 'loading';
  if (input.folderMissing) return 'missing';
  if (input.empty) return 'empty';
  return 'ready';
}
