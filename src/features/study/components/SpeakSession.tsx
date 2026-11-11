import { X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { SpeakPractice } from '@/features/speech/components/SpeakPractice';
import { colors, space } from '@/theme/tokens';

import { gradeSpokenPass } from '../games/speakGrade';
import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import { studyStepsForRepeat, summarizeSpeak, type SpeakTake } from '../sessionSummary';
import { speakExtras } from '../speakExtras';
import type { StudySpeakStep } from '../types';
import { SessionSummaryView } from './SessionSummary';

type SpeakSessionProps = {
  steps: readonly StudySpeakStep[];
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onClose: () => void;
};

export function SpeakSession({ steps, onRecord, onClose }: SpeakSessionProps) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState(steps);
  const [index, setIndex] = useState(0);
  const attemptsRef = useRef(0);
  const [attempts, setAttemptsState] = useState(0);
  const [takes, setTakes] = useState<SpeakTake[]>([]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rateError, setRateError] = useState(false);
  const step = queue[index] ?? null;

  const finish = async (passed: boolean, score: number | null) => {
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
    const take: SpeakTake = {
      key: step.id,
      itemId: step.itemId,
      phraseEs: step.promptEs,
      phraseTr: step.phraseTr,
      audio: step.audio,
      score,
      passed,
    };
    attemptsRef.current = 0;
    setAttemptsState(0);
    setBusy(false);
    setTakes((current) => [...current, take]);
    if (index + 1 >= queue.length) setDone(true);
    else setIndex(index + 1);
  };

  if (done || !step) {
    const summary = summarizeSpeak(takes);
    return (
      <SessionSummaryView
        summary={summary}
        notice={rateError ? t('study.rateError') : null}
        onDone={onClose}
        onRepeat={() => {
          const next = studyStepsForRepeat(queue, summary.repeatIds);
          if (next.length === 0) return;
          setQueue(next.filter((item): item is StudySpeakStep => item.type === 'speak_repeat'));
          setTakes([]);
          setIndex(0);
          setDone(false);
        }}
      />
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
          void finish(false, null);
        }}
        onContinue={(passed = true, score = null) => {
          void finish(passed, score);
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
  center: {
    textAlign: 'center',
  },
});
