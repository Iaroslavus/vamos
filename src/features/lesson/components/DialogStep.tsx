import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { useAudioPreference } from '@/features/audio/preference';
import type { Item } from '@/features/content/schema';
import { SpeakPracticeSheet } from '@/features/speech/components/SpeakPracticeSheet';
import { AddToVocabSheet } from '@/features/vocab/components/AddToVocabSheet';
import { colors, fonts, radius, space } from '@/theme/tokens';

import type { DialogStepResult, PlayableDialogLine } from '../dialog';
import { normalizeForCompare } from '../grading';
import type { DialogStep as DialogStepData } from '../generator';
import { useDialogController } from '../hooks/useDialogController';
import { useDialogSpeakSheet } from '../hooks/useDialogSpeakSheet';
import type { AudioPreference } from '../intro';
import { DialogChoices } from './DialogChoices';
import { DialogFinale } from './DialogFinale';
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
  speakerName?: string | null;
  partner?: string;
  place?: string;
};

export function DialogStep({
  step,
  items,
  onContinue,
  onComplete,
  responseMode = 'choose',
  onSpeakAloud,
  audioVariant: audioVariantProp,
  speakerName = null,
  partner = '',
  place = '',
}: DialogStepProps) {
  const { t } = useTranslation();
  const profilePreference = useAudioPreference();
  const audioVariant = audioVariantProp ?? profilePreference;
  const insets = useSafeAreaInsets();
  const { state, choose, replay } = useDialogController({
    step,
    items,
    audioVariant,
    speakerName,
    onComplete,
  });
  const [vocabItemId, setVocabItemId] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
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

  const initial = partner.trim().charAt(0).toLocaleUpperCase();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.who}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{initial}</Text>
          </View>
          <View style={styles.whoCopy}>
            <Text variant="bodyBold" numberOfLines={1}>
              {partner}
            </Text>
            <Text variant="caption" color={colors.inkMuted} numberOfLines={1}>
              {place}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={t('lesson.dialogTranslation')}
          accessibilityState={{ checked: showTranslation }}
          onPress={() => setShowTranslation((open) => !open)}
          style={[styles.translate, showTranslation ? styles.translateOn : null]}
        >
          <Text variant="caption" color={showTranslation ? colors.tealDeep : colors.ink}>
            {t('lesson.dialogTranslation')}
          </Text>
        </Pressable>
      </View>
      <DialogTranscript
        state={state}
        title={t('lesson.dialogTitle')}
        openTranslations={
          showTranslation ? new Set(state.lines.map((_, index) => index)) : openTranslations
        }
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
          <DialogFinale lines={state.lines.slice(0, state.visibleCount)} onContinue={onContinue} />
        ) : null}
      </View>
      <SpeakPracticeSheet
        visible={speak.open}
        mode="dialog"
        phrase=""
        options={speak.options}
        acceptIds={userLine?.acceptIds}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  who: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minWidth: 0,
  },
  whoCopy: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffronSoft,
  },
  initial: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
  },
  translate: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
  },
  translateOn: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
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
