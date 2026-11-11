import LottieView from 'lottie-react-native';
import { Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Ring } from '@/components/Ring';
import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { playLessonAudio } from '@/features/audio/playback';
import { displayLine, displayText } from '@/features/content/displayText';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, motion, radius, space } from '@/theme/tokens';

import { isPerfect, type SessionSummary, type SummaryRow } from '../sessionSummary';

type SessionSummaryViewProps = {
  summary: SessionSummary;
  onRepeat: () => void;
  onDone: () => void;
  /** A note under the list, such as a failed save. */
  notice?: string | null;
};

export function SessionSummaryView({ summary, onRepeat, onDone, notice }: SessionSummaryViewProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const perfect = isPerfect(summary);
  const canRepeat = !perfect && summary.repeatIds.length > 0;
  const percentLabel = t('sessionSummary.percent', { count: summary.percent });

  return (
    <View style={styles.root} testID="session-summary">
      {perfect && !reduceMotion ? (
        <View pointerEvents="none" style={styles.confetti}>
          <LottieView
            source={require('../../../../assets/lottie/confetti.json')}
            autoPlay
            loop={false}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Appear>
          <View style={styles.ring}>
            <Ring
              progress={summary.percent / 100}
              size={148}
              strokeWidth={12}
              color={scoreColor(summary.percent)}
              prominent
              label={percentLabel}
              accessibilityLabel={t('sessionSummary.scoreLabel', { percent: summary.percent })}
            />
          </View>
        </Appear>
        <Text variant="bodyBold" style={styles.center}>
          {caption(summary, t)}
        </Text>
        {perfect ? (
          <Text variant="h2" style={styles.center}>
            {t('sessionSummary.perfect')}
          </Text>
        ) : null}
        {summary.rows.map((row, index) => (
          <Appear key={row.key} delay={Math.min(index, 8) * motion.stagger}>
            <SummaryLine row={row} index={index + 1} />
          </Appear>
        ))}
        {notice ? (
          <Text variant="caption" color={colors.errorInk} style={styles.center}>
            {notice}
          </Text>
        ) : null}
      </ScrollView>
      {canRepeat ? (
        <Button
          title={t(
            summary.variant === 'cards' ? 'sessionSummary.repeatCards' : 'sessionSummary.repeat',
          )}
          onPress={onRepeat}
        />
      ) : null}
      <Button
        title={t('sessionSummary.done')}
        variant={canRepeat ? 'secondary' : 'primary'}
        onPress={onDone}
      />
    </View>
  );
}

function SummaryLine({ row, index }: { row: SummaryRow; index: number }) {
  const { t } = useTranslation();
  const phrase = displayLine(row.phrase);
  const correct = shownValue(row.correct, row.valueKind, t);
  const yours =
    row.yours == null || row.yours.trim().length === 0
      ? null
      : shownValue(row.yours, row.valueKind, t);

  return (
    <View style={styles.miss}>
      <View style={styles.missTop}>
        <Text variant="bodyBold" style={styles.caption}>
          {phrase}
        </Text>
        <IconButton
          accessibilityLabel={t('sessionSummary.play', {
            phrase: displayText(row.phraseEs),
            index,
          })}
          onPress={() => {
            void playLessonAudio({ audio: row.audio, text: row.phraseEs });
          }}
        >
          <Volume2 size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
      </View>
      <Text variant="body">{correct}</Text>
      {row.score != null ? (
        <Text variant="caption" color={colors.inkMuted}>
          {t('sessionSummary.rowScore', { score: row.score })}
        </Text>
      ) : null}
      {yours ? (
        <Text variant="caption" color={colors.inkMuted}>
          {t('sessionSummary.youAnswered', { answer: yours })}
        </Text>
      ) : null}
    </View>
  );
}

function shownValue(
  value: string,
  kind: SummaryRow['valueKind'],
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (kind === 'bool') {
    if (value === 'true') return t('sessionSummary.true');
    if (value === 'false') return t('sessionSummary.false');
    return t('sessionSummary.blank');
  }
  return displayLine(value);
}

function caption(summary: SessionSummary, t: ReturnType<typeof useTranslation>['t']): string {
  if (summary.variant === 'cards') {
    return t('sessionSummary.cardsLine', { know: summary.correct, again: summary.wrong });
  }
  if (summary.variant === 'speak') {
    return t('sessionSummary.speakLine', { score: summary.percent });
  }
  return t('sessionSummary.line', { correct: summary.correct, wrong: summary.wrong });
}

function scoreColor(percent: number): string {
  if (percent >= 80) return colors.teal;
  if (percent >= 50) return colors.saffron;
  return colors.coral;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space.md,
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    zIndex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: space.md,
    paddingBottom: space.lg,
  },
  ring: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  miss: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  missTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  caption: {
    flex: 1,
  },
});
