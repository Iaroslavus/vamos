import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { Item } from '@/features/content/schema';
import { colors, space } from '@/theme/tokens';

import type { DialogStepResult } from '../dialog';
import type { DialogStep as DialogStepData } from '../generator';
import { useDialogController } from '../hooks/useDialogController';
import { useDialogSpeech } from '../hooks/useDialogSpeech';
import type { AudioPreference } from '../intro';
import { DialogChoices } from './DialogChoices';
import { DialogTranscript } from './DialogTranscript';

const EMPTY_LINES = new Set<number>();

export type DialogResponseMode = 'choose' | 'speak';

export type DialogStepProps = {
  step: DialogStepData;
  items: readonly Item[];
  onContinue: () => void;
  /** Fired once, when the script finishes or hearts run out. */
  onComplete?: (result: DialogStepResult) => void;
  /**
   * `choose` shows option chips and «Сказать вслух».
   * `speak` hides the chips. The button listens and, on a match, sends that line.
   */
  responseMode?: DialogResponseMode;
  onSpeakAloud?: () => void;
  audioVariant?: AudioPreference;
};

export function DialogStep({
  step,
  items,
  onContinue,
  onComplete,
  responseMode = 'choose',
  onSpeakAloud,
  audioVariant = 'es',
}: DialogStepProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { state, choose, replay } = useDialogController({
    step,
    items,
    audioVariant,
    onComplete,
  });
  const [openByStep, setOpenByStep] = useState<{ id: string; open: ReadonlySet<number> }>(() => ({
    id: step.id,
    open: new Set(),
  }));
  const openTranslations = openByStep.id === step.id ? openByStep.open : EMPTY_LINES;

  const toggleTranslation = (index: number) => {
    setOpenByStep((current) => {
      const base = current.id === step.id ? current.open : EMPTY_LINES;
      const next = new Set(base);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { id: step.id, open: next };
    });
  };

  const current = state.phase === 'choose' ? state.lines[state.index] : null;
  const userLine = current?.who === 'user' ? current : null;
  const speech = useDialogSpeech(userLine?.options ?? null, choose);

  const onSpeak = () => {
    onSpeakAloud?.();
    speech.toggle();
  };

  return (
    <View style={styles.root}>
      <DialogTranscript
        state={state}
        title={t('lesson.dialogTitle')}
        openTranslations={openTranslations}
        onToggleTranslation={toggleTranslation}
        onReplay={replay}
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {userLine ? (
          <DialogChoices
            options={userLine.options}
            rejectedIds={state.rejectedIds}
            hint={state.hint}
            shake={state.shake}
            responseMode={responseMode}
            listening={speech.listening}
            speakDisabled={speech.disabled}
            onChoose={choose}
            onSpeakAloud={onSpeak}
          />
        ) : null}
        {speech.notice === 'miss' ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('speech.dialogMiss')}
          </Text>
        ) : null}
        {speech.notice === 'denied' ? (
          <Text variant="body" color={colors.inkMuted}>
            {t('speech.permissionBody')}
          </Text>
        ) : null}
        {state.phase === 'done' ? (
          <Button title={t('lesson.continue')} variant="primary" onPress={onContinue} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.ground,
  },
});
