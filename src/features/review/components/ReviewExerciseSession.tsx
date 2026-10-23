import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultSheet } from '@/components/ResultSheet';
import { Text } from '@/components/Text';
import { AccentBar } from '@/features/lesson/components/AccentBar';
import { LessonHearts } from '@/features/lesson/components/LessonHearts';
import { MistakesIntro } from '@/features/lesson/components/MistakesIntro';
import type { GradeStatus } from '@/features/lesson/grading';
import { colors, space } from '@/theme/tokens';

import { useReviewExercisePlayer } from '../hooks/useReviewExercisePlayer';
import { ReviewExerciseBody } from './ReviewExerciseBody';

type ReviewExerciseSessionProps = {
  busy: boolean;
  rateError: boolean;
  onChecked: (exerciseId: string, status: GradeStatus, sessionFailed: boolean) => void;
  onAdvance: () => void;
};

export function ReviewExerciseSession({
  busy,
  rateError,
  onChecked,
  onAdvance,
}: ReviewExerciseSessionProps) {
  const { t } = useTranslation();
  const player = useReviewExercisePlayer({ busy, onChecked });
  const idle = !player.exercise && player.status !== 'mistakes_intro';

  if (idle) return <View style={styles.root} />;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.progress}>
          <ProgressBar
            progress={player.progress}
            accessibilityLabel={t('lesson.progressA11y', {
              solved: player.solved,
              total: player.total,
            })}
          />
        </View>
        <LessonHearts hearts={player.hearts} maxHearts={player.maxHearts} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {player.exercise ? (
          <ReviewExerciseBody
            exercise={player.exercise}
            userAnswer={player.userAnswer}
            disabled={player.disabled}
            gradeStatus={player.gradeStatus}
            onSelect={player.setAnswer}
            onType={player.setAnswer}
            inputRef={player.inputRef}
          />
        ) : null}
      </ScrollView>

      {rateError ? (
        <Text variant="caption" color={colors.errorInk} style={styles.error}>
          {t('review.rateError')}
        </Text>
      ) : null}

      {player.typing ? (
        <AccentBar
          disabled={player.disabled}
          onInsert={(symbol) => player.inputRef.current?.insertSymbol(symbol)}
        />
      ) : null}

      <View style={styles.footer}>
        <Button title={t('lesson.check')} disabled={!player.canCheck} onPress={player.onCheck} />
      </View>

      <ResultSheet
        visible={player.sheetVisible}
        variant={player.sheetSuccess ? 'success' : 'error'}
        title={player.sheetTitle}
        message={player.sheetMessage}
        continueLabel={t('lesson.continue')}
        onContinue={onAdvance}
      />

      <MistakesIntro
        visible={player.status === 'mistakes_intro'}
        remaining={player.mistakesLeft}
        onContinue={player.continueMistakesIntro}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  progress: { flex: 1 },
  body: { flex: 1 },
  bodyContent: {
    flexGrow: 1,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  error: { textAlign: 'center' },
  footer: { paddingTop: space.md },
});
