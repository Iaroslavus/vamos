import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, space } from '@/theme/tokens';

import { TopicTestPlay } from './components/TopicTestPlay';
import { TopicTestResult } from './components/TopicTestResult';
import { useTopicTestSession } from './hooks/useTopicTestSession';

type TopicTestScreenProps = {
  topicId: string;
};

export function TopicTestScreen({ topicId }: TopicTestScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const inputRef = useRef<AnswerTextFieldHandle>(null);
  const session = useTopicTestSession(topicId);
  const bottom = Math.max(insets.bottom, space.lg);

  if (!session.loaded || session.loaded.tasks.length === 0) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Text variant="h3" style={styles.center}>
          {t('topicTest.empty')}
        </Text>
        <Button title={t('topicTest.close')} variant="secondary" onPress={session.leave} />
      </View>
    );
  }

  if (session.phase === 'result' && session.settlement) {
    const settlement = session.settlement;
    const lessonLine =
      settlement.missedLessons.length > 0
        ? t('topicTest.reviewLessons', {
            lessons: settlement.missedLessons
              .map((lesson) => t('topicTest.lesson', { number: lesson.number }))
              .join(' · '),
          })
        : null;
    return (
      <View style={[styles.root, { paddingTop: insets.top + space.lg, paddingBottom: bottom }]}>
        <TopicTestResult
          passed={settlement.passed}
          title={t(settlement.passed ? 'topicTest.passedTitle' : 'topicTest.failedTitle')}
          body={t(settlement.passed ? 'topicTest.passedBody' : 'topicTest.failedBody', {
            score: settlement.score,
          })}
          lessons={settlement.passed ? null : lessonLine}
          primary={t(settlement.passed ? 'topicTest.continue' : 'topicTest.retry')}
          saving={session.saving}
          error={session.saveError ? t('topicTest.saveError') : null}
          retry={t('topicTest.saveRetry')}
          reduceMotion={reduceMotion}
          onRetry={session.retrySave}
          onPrimary={() => {
            if (settlement.passed) session.finishPassed();
            else session.retake();
          }}
        />
      </View>
    );
  }

  const task = session.task;
  if (!task || session.phase === 'result') return <View style={styles.root} />;

  return (
    <TopicTestPlay
      task={task}
      tasks={session.loaded.tasks.length}
      index={session.index}
      exercise={session.exercise}
      phase={session.phase}
      answer={session.answer}
      grade={session.grade}
      revealed={session.revealed}
      language={session.language}
      paddingTop={insets.top + space.sm}
      paddingBottom={bottom}
      inputRef={inputRef}
      onClose={session.leave}
      onSelect={session.setAnswer}
      onAnswerChange={session.setAnswer}
      onSpeak={session.speak}
      onCheck={session.check}
      onNext={session.forward}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  centered: {
    justifyContent: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  center: {
    textAlign: 'center',
  },
});
