import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import type { StudyExerciseStep, StudyMatchStep, StudyStep, StudyUnit } from '../types';
import { DictationSession } from './DictationSession';
import { StudyPlayer } from './StudyPlayer';
import { TimedPairsSession } from './TimedPairsSession';

type LearnMixSessionProps = {
  steps: readonly StudyStep[];
  userId: string | null;
  folderId: string;
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onClose: () => void;
};

export function LearnMixSession({
  steps,
  userId,
  folderId,
  onRecord,
  onClose,
}: LearnMixSessionProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const advance = () => setIndex((current) => current + 1);

  if (!step) {
    return (
      <View style={styles.done}>
        <Text variant="h2" style={styles.center}>
          {t('study.summaryTitle')}
        </Text>
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('study.summaryBody', { count: steps.length })}
        </Text>
        <Button title={t('study.backToFolder')} onPress={onClose} />
      </View>
    );
  }

  if (step.type === 'match_pairs') {
    return (
      <TimedPairsSession
        key={step.id}
        units={unitsFromPairs(step)}
        userId={userId}
        folderId={folderId}
        onClose={onClose}
        onFinished={advance}
      />
    );
  }

  if (step.type === 'type_translation' && step.playEs) {
    return (
      <DictationSession
        key={step.id}
        units={[unitFromExercise(step)]}
        onRecord={onRecord}
        onClose={onClose}
        onFinished={advance}
      />
    );
  }

  return (
    <StudyPlayer
      key={step.id}
      steps={[step]}
      recordGrades
      onRecord={onRecord}
      onClose={onClose}
      onFinished={advance}
    />
  );
}

function unitsFromPairs(step: StudyMatchStep): StudyUnit[] {
  return step.pairs.map((pair) => ({
    id: pair.itemId,
    es: pair.es,
    tr: pair.tr,
    audio: null,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: false,
  }));
}

function unitFromExercise(step: StudyExerciseStep): StudyUnit {
  return {
    id: step.itemId,
    es: step.phraseEs,
    tr: step.phraseTr,
    audio: step.audio,
    introduced: true,
    state: 2,
    due: false,
    hard: false,
    recall: step.direction === 'ru_to_es',
  };
}

const styles = StyleSheet.create({
  done: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
