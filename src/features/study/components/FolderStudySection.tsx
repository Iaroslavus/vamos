import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';

import { MasteryBar } from './MasteryBar';
import { StudySheet } from './StudySheet';
import { glossItem } from '../gloss';
import { useReviewSnapshot } from '../hooks/useReviewSnapshot';
import { useStudyPrefs } from '../hooks/useStudyPrefs';
import { masteryCounts } from '../fsrs';
import { isPlayableStudyMode } from '../modes';
import { buildStudyUnits, selectStudyUnits } from '../sessionPlan';
import type { StudyMode } from '../types';

type FolderStudySectionProps = {
  folderId: string;
  userId: string | null;
  itemIds: readonly string[];
};

export function FolderStudySection({ folderId, userId, itemIds }: FolderStudySectionProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const review = useReviewSnapshot(userId);
  const prefs = useStudyPrefs(userId, folderId);
  const [open, setOpen] = useState(false);
  const now = useMemo(() => new Date(), []);
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

  const start = (mode: StudyMode) => {
    if (!isPlayableStudyMode(mode)) return;
    if (selectStudyUnits(units, prefs.prefs.settings, mode).length === 0) return;
    prefs.setLastMode(mode);
    setOpen(false);
    router.push({ pathname: '/study', params: { folder: folderId, mode } });
  };

  return (
    <>
      <MasteryBar counts={masteryCounts(units)} />
      <Button
        title={t('study.learn')}
        disabled={itemIds.length === 0 || userId == null}
        onPress={() => setOpen(true)}
      />
      <StudySheet
        visible={open}
        units={units}
        settings={prefs.prefs.settings}
        onClose={() => setOpen(false)}
        onChangeSettings={prefs.setSettings}
        onStart={start}
      />
    </>
  );
}
