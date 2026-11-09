import { X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { SpeakPractice } from '@/features/speech/components/SpeakPractice';
import { colors, space } from '@/theme/tokens';

import { gradeSpokenPass } from '../games/speakGrade';
import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import { speakExtras } from '../speakExtras';
import type { StudySpeakStep } from '../types';

type SpeakSessionProps = {
  steps: readonly StudySpeakStep[];
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onClose: () => void;
};

export function SpeakSession({ steps, onRecord, onClose }: SpeakSessionProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const attemptsRef = useRef(0);
  const [attempts, setAttemptsState] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rateError, setRateError] = useState(false);
  const step = steps[index] ?? null;

  const finish = async (passed: boolean) => {
    if (!step || busy) return;
    setBusy(true);
    setRateError(false);
    const grade = passed ? gradeSpokenPass(attemptsRef.current) : 'incorrect';
    try {
      await onRecord({
        itemId: step.itemId,
        direction: step.direction,
        grade,
        stepId: step.id,
      });
    } catch {
      setRateError(true);
      setBusy(false);
      return;
    }
    attemptsRef.current = 0;
    setAttemptsState(0);
    setBusy(false);
    if (index + 1 >= steps.length) setDone(true);
    else setIndex(index + 1);
  };

  if (done || !step) {
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

  const extras = speakExtras(step.itemId);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
        <Text variant="bodyBold" style={styles.progress}>
          {t('study.games.speakProgress', { current: index + 1, total: steps.length })}
        </Text>
      </View>
      {rateError ? (
        <Text variant="caption" color={colors.errorInk} style={styles.center}>
          {t('study.rateError')}
        </Text>
      ) : null}
      <SpeakPractice
        key={step.id}
        mode="step"
        phrase={step.promptEs}
        audio={step.audio}
        sayRu={extras.sayRu}
        parts={extras.parts}
        confusables={extras.confusables}
        featuresPath={extras.featuresPath}
        passScore={step.passScore}
        attemptsUsed={attempts}
        onAttemptsUsed={(count) => {
          attemptsRef.current = count;
          setAttemptsState(count);
        }}
        onSkip={() => {
          void finish(false);
        }}
        onContinue={() => {
          void finish(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  progress: {
    flex: 1,
  },
  done: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
