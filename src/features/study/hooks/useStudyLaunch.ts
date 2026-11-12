import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFolders } from '@/features/vocab/hooks/useFolders';

import { glossItem } from '../gloss';
import { useReviewSnapshot } from '../hooks/useReviewSnapshot';
import { useStudyPrefs } from '../hooks/useStudyPrefs';
import { isPlayableStudyMode } from '../modes';
import { buildStudyUnits, selectStudyUnits, sessionPlan } from '../sessionPlan';
import type { StudyMode, StudyStep, StudyUnit } from '../types';

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
        gloss: (id) => glossItem(id, i18n.language, vocab.snapshot?.userItems ?? []),
      }),
    [i18n.language, itemIds, now, review.data, vocab.snapshot?.userItems],
  );

  const settings = prefs.prefs.settings;
  const selected = useMemo(() => {
    if (!mode || !prefs.ready) return [] as StudyUnit[];
    return selectStudyUnits(units, settings, mode);
  }, [mode, prefs.ready, settings, units]);

  const steps = useMemo(() => {
    if (!mode || !prefs.ready) return [] as StudyStep[];
    return sessionPlan(mode, units, settings);
  }, [mode, prefs.ready, settings, units]);

  const folder = vocab.snapshot?.folders.find((entry) => entry.id === folderId) ?? null;
  const waiting = vocab.isPending || !prefs.ready || (vocab.userId != null && review.isPending);

  return {
    status: launchStatus({
      mode,
      waiting,
      folderMissing: vocab.isSuccess && !folder,
      failed: vocab.isError || review.isError,
      empty: mode === 'test' ? selected.length === 0 : steps.length === 0,
    }),
    steps,
    selected,
    settings,
    testSettings: prefs.prefs.test,
    setSettings: prefs.setSettings,
    setTestSettings: prefs.setTestSettings,
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
