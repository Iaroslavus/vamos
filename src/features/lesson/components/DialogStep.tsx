import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import type { Item } from '@/features/content/schema';
import { SpeakPracticeSheet } from '@/features/speech/components/SpeakPracticeSheet';
import { AddToVocabSheet } from '@/features/vocab/components/AddToVocabSheet';
import { colors, space } from '@/theme/tokens';

import type { DialogStepResult, PlayableDialogLine } from '../dialog';
import { normalizeForCompare } from '../grading';
import type { DialogStep as DialogStepData } from '../generator';
import { useDialogController } from '../hooks/useDialogController';
import { useDialogSpeakSheet } from '../hooks/useDialogSpeakSheet';
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
  const [vocabItemId, setVocabItemId] = useState<string | null>(null);
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
  const speak = useDialogSpeakSheet(userLine);

  const onSpeak = () => {
    onSpeakAloud?.();
    speak.openSheet();
  };

  return (
    <View style={styles.root}>
      <DialogTranscript
        state={state}
        title={t('lesson.dialogTitle')}
        openTranslations={openTranslations}
        onToggleTranslation={toggleTranslation}
        onReplay={replay}
        canLongPress={(index) => itemIdForLine(state.lines[index], items) !== null}
        longPressHint={t('vocab.longPressAdd')}
        onLongPress={(index) => {
          const itemId = itemIdForLine(state.lines[index], items);
          if (itemId) setVocabItemId(itemId);
        }}
      />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        {userLine ? (
          <DialogChoices
            options={userLine.options}
            rejectedIds={state.rejectedIds}
            hint={state.hint}
            shake={state.shake}
            responseMode={responseMode}
            speakDisabled={speak.disabled}
            onChoose={choose}
            onSpeakAloud={onSpeak}
            longPressHint={t('vocab.longPressAdd')}
            onLongPressOption={setVocabItemId}
          />
        ) : null}
        {state.phase === 'done' ? (
          <Button title={t('lesson.continue')} variant="primary" onPress={onContinue} />
        ) : null}
      </View>
      <SpeakPracticeSheet
        visible={speak.open}
        mode="dialog"
        phrase=""
        options={speak.options}
        attemptsUsed={speak.used}
        onAttemptsUsed={speak.onAttemptsUsed}
        onMatch={(optionId) => {
          speak.close();
          choose(optionId);
        }}
        onClose={speak.close}
      />
      <AddToVocabSheet
        visible={vocabItemId !== null}
        itemIds={vocabItemId ? [vocabItemId] : []}
        onClose={() => setVocabItemId(null)}
        onChanged={() => undefined}
      />
    </View>
  );
}

function itemIdForLine(
  line: PlayableDialogLine | undefined,
  items: readonly Item[],
): string | null {
  if (!line) return null;
  if (line.who === 'user') return line.targetId;
  const key = normalizeForCompare(line.es);
  return items.find((item) => normalizeForCompare(item.es) === key)?.id ?? null;
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
