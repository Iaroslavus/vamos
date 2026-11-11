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
import { colors, motion, radius, space } from '@/theme/tokens';

import type { TestMiss, TestResult as TestScore } from '../testMode';

type TestResultProps = {
  score: TestScore;
  canRepeat: boolean;
  adding: boolean;
  added: boolean;
  addError: boolean;
  rateError: boolean;
  onRepeat: () => void;
  onAdd: () => void;
  onClose: () => void;
};

export function TestResultView({
  score,
  canRepeat,
  adding,
  added,
  addError,
  rateError,
  onRepeat,
  onAdd,
  onClose,
}: TestResultProps) {
  const { t } = useTranslation();
  const hasMisses = score.misses.length > 0;
  const percentLabel = t('study.test.percent', { count: score.percent });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Appear>
          <View style={styles.ring}>
            <Ring
              progress={score.percent / 100}
              size={148}
              strokeWidth={12}
              color={scoreColor(score.percent)}
              prominent
              label={percentLabel}
              accessibilityLabel={t('study.test.scoreLabel', { percent: score.percent })}
            />
          </View>
        </Appear>
        <Text variant="h2" style={styles.center}>
          {t('study.test.resultTitle')}
        </Text>
        {hasMisses ? (
          <Text variant="bodyBold">{t('study.test.missHeading')}</Text>
        ) : (
          <Text variant="body" color={colors.inkMuted} style={styles.center}>
            {t('study.test.perfect')}
          </Text>
        )}
        {score.misses.map((miss, index) => (
          <Appear key={miss.key} delay={Math.min(index, 8) * motion.stagger}>
            <MissRow miss={miss} index={index + 1} />
          </Appear>
        ))}
        {rateError ? (
          <Text variant="caption" color={colors.errorInk} style={styles.center}>
            {t('study.test.rateError')}
          </Text>
        ) : null}
        {addError ? (
          <Text variant="caption" color={colors.errorInk} style={styles.center}>
            {t('study.test.addError')}
          </Text>
        ) : null}
      </ScrollView>
      {hasMisses ? (
        <Button title={t('study.test.repeat')} disabled={!canRepeat || adding} onPress={onRepeat} />
      ) : null}
      {hasMisses ? (
        <Button
          title={t(added ? 'study.test.added' : 'study.test.addDifficult')}
          variant="secondary"
          disabled={adding || added}
          onPress={onAdd}
        />
      ) : null}
      <Button
        title={t('study.backToFolder')}
        variant={hasMisses ? 'secondary' : 'primary'}
        onPress={onClose}
      />
    </View>
  );
}

function MissRow({ miss, index }: { miss: TestMiss; index: number }) {
  const { t } = useTranslation();
  const yours =
    miss.kind === 'bool'
      ? judgment(miss.yours, t)
      : displayLine(miss.yours) || t('study.test.blank');
  const correct = miss.kind === 'bool' ? judgment(miss.correct, t) : displayLine(miss.correct);

  return (
    <View style={styles.miss}>
      <View style={styles.missTop}>
        <Text variant="bodyBold" style={styles.caption}>
          {displayLine(miss.caption)}
        </Text>
        <IconButton
          accessibilityLabel={t('study.test.play', { phrase: displayText(miss.phraseEs), index })}
          onPress={() => {
            void playLessonAudio({ audio: miss.audio, text: miss.phraseEs });
          }}
        >
          <Volume2 size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
      </View>
      <Text variant="body">{t('study.test.missLine', { yours, correct })}</Text>
      {miss.truth ? (
        <Text variant="caption" color={colors.inkMuted}>
          {t('study.test.truth', { text: displayText(miss.truth) })}
        </Text>
      ) : null}
    </View>
  );
}

function judgment(value: string, t: ReturnType<typeof useTranslation>['t']): string {
  if (value === 'true') return t('study.test.true');
  if (value === 'false') return t('study.test.false');
  return t('study.test.blank');
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
