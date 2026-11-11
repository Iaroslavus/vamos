import { X } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ResultSheet } from '@/components/ResultSheet';
import { Text } from '@/components/Text';
import { stopLessonAudio } from '@/features/audio/playback';
import { useAudioPreference } from '@/features/audio/preference';
import { AccentBar } from '@/features/lesson/components/AccentBar';
import { buildResultSheetModel } from '@/features/lesson/feedbackView';
import { colors, space } from '@/theme/tokens';

import { dictationMask, dictationPoints } from '../games/dictation';
import { playUnit } from '../playUnit';
import { useDictationSession } from '../hooks/useDictationSession';
import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import type { StudyUnit } from '../types';
import { DictationPrompt } from './DictationPrompt';

type DictationSessionProps = {
  units: readonly StudyUnit[];
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onClose: () => void;
  /** When set, the last phrase continues a mixed session instead of the summary. */
  onFinished?: () => void;
};

export function DictationSession({ units, onRecord, onClose, onFinished }: DictationSessionProps) {
  const { t } = useTranslation();
  const preference = useAudioPreference();
  const session = useDictationSession({ units, onRecord });
  const unit = session.unit;
  const reported = useRef(false);

  useEffect(() => {
    if (!unit) return undefined;
    playUnit(unit.id, unit.es, preference);
    return () => {
      void stopLessonAudio();
    };
  }, [preference, unit]);

  useEffect(() => {
    if (!session.done || !onFinished || reported.current) return;
    reported.current = true;
    onFinished();
  }, [onFinished, session.done]);

  if (session.done || !unit) {
    if (onFinished) return null;
    return (
      <View style={styles.done}>
        <Text variant="h2" style={styles.center}>
          {t('study.games.dictationDone')}
        </Text>
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('study.games.dictationTotal', { score: session.total })}
        </Text>
        <Button title={t('study.backToFolder')} onPress={onClose} />
      </View>
    );
  }

  const mask = dictationMask(unit.es, session.reveals);
  const stake = dictationPoints('correct', session.reveals);
  const exercise = {
    id: unit.id,
    type: 'type_translation' as const,
    prompt_ru: t('study.games.dictationPrompt'),
    prompt: unit.es,
    direction: 'ru_to_es' as const,
    answer: unit.es,
    phraseEs: unit.es,
    phraseTr: unit.tr,
    itemIds: [unit.id],
    audio: unit.audio,
  };
  const model = buildResultSheetModel({
    t,
    exercise,
    grade: session.result,
    failed: false,
  });
  const points = session.result ? dictationPoints(session.result.status, session.reveals) : stake;
  const message = [
    session.rateError ? t('study.rateError') : model.message,
    t('study.games.dictationStake', { score: points }),
  ]
    .filter((line) => line && line.length > 0)
    .join(' ');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
        <View style={styles.headerBody}>
          <Text variant="caption" color={colors.inkMuted}>
            {t('study.games.speakProgress', {
              current: session.index + 1,
              total: session.totalUnits,
            })}
          </Text>
          <Text variant="bodyBold">{t('study.games.dictationStake', { score: stake })}</Text>
        </View>
      </View>
      <DictationPrompt
        prompt={t('study.games.dictationPrompt')}
        phrase={unit.es}
        audio={unit.audio}
        mask={mask}
        maskLabel={t('study.games.dictationMask', { mask })}
        value={session.value}
        placeholder={t('study.games.dictationPlaceholder')}
        revealTitle={t('study.games.dictationReveal')}
        revealLabel={t('study.games.dictationRevealLabel', { score: stake })}
        disabled={session.sheet || session.busy}
        revealDisabled={session.sheet || session.busy || mask === unit.es}
        inputRef={session.inputRef}
        onChangeText={session.setValue}
        onReveal={session.reveal}
      />
      <AccentBar
        disabled={session.sheet || session.busy}
        onInsert={(symbol) => session.inputRef.current?.insertSymbol(symbol)}
      />
      <Button title={t('lesson.check')} disabled={!session.canCheck} onPress={session.check} />
      <ResultSheet
        visible={session.sheet}
        variant={model.variant}
        title={model.title}
        message={message}
        phraseEs={model.phraseEs}
        phraseTr={model.phraseTr}
        correctLabel={model.correctLabel}
        speakText={model.speakText}
        audio={model.audio}
        autoPlay={model.autoPlay}
        continueLabel={session.retrying ? t('study.again') : t('lesson.continue')}
        onContinue={session.goOn}
      />
    </KeyboardAvoidingView>
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
  headerBody: {
    flex: 1,
    gap: space.xs,
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
