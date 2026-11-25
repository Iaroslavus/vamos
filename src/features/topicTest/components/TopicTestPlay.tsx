import { X } from 'lucide-react-native';
import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { displayEs } from '@/features/content/displayText';
import type { ContentLocale } from '@/features/content/text';
import { AccentBar } from '@/features/lesson/components/AccentBar';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import type { GradeStatus } from '@/features/lesson/grading';
import type { LessonExerciseItem } from '@/features/lesson/store';
import { colors, space } from '@/theme/tokens';

import type { TopicTestTask } from '../assemble';
import { CompactFeedback } from './CompactFeedback';
import { TopicTestTaskView } from './TopicTestTaskView';

type TopicTestPlayProps = {
  task: TopicTestTask;
  tasks: number;
  index: number;
  exercise: LessonExerciseItem | null;
  phase: 'ask' | 'feedback';
  answer: string;
  grade: GradeStatus | null;
  revealed: string;
  language: ContentLocale;
  paddingTop: number;
  paddingBottom: number;
  inputRef: Ref<AnswerTextFieldHandle>;
  onClose: () => void;
  onSelect: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onSpeak: (passed: boolean) => void;
  onCheck: () => void;
  onNext: () => void;
};

export function TopicTestPlay({
  task,
  tasks,
  index,
  exercise,
  phase,
  answer,
  grade,
  revealed,
  language,
  paddingTop,
  paddingBottom,
  inputRef,
  onClose,
  onSelect,
  onAnswerChange,
  onSpeak,
  onCheck,
  onNext,
}: TopicTestPlayProps) {
  const { t } = useTranslation();
  const speakStep = task.step.type === 'speak_repeat' ? task.step : null;
  const canCheck = phase === 'ask' && speakStep === null && answer.trim().length > 0;
  const showPhrase = speakStep !== null && phase === 'feedback';

  return (
    <View style={[styles.root, { paddingTop }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('topicTest.close')}
          onPress={onClose}
          hitSlop={12}
          style={styles.close}
        >
          <X size={24} color={colors.ink} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.progress}>
          <ProgressBar
            progress={tasks === 0 ? 0 : index / tasks}
            accessibilityLabel={t('topicTest.progress', { current: index + 1, total: tasks })}
          />
        </View>
      </View>
      {showPhrase ? (
        <View style={styles.speakDone}>
          <Text variant="h2" style={styles.center}>
            {displayEs(speakStep?.prompt_es ?? '')}
          </Text>
        </View>
      ) : (
        <TopicTestTaskView
          task={task}
          exercise={exercise}
          answer={answer}
          disabled={phase !== 'ask'}
          gradeStatus={phase === 'feedback' ? grade : null}
          language={language}
          onSelect={onSelect}
          onAnswerChange={onAnswerChange}
          onSpeak={onSpeak}
          inputRef={inputRef}
        />
      )}
      {exercise?.type === 'type_translation' && phase === 'ask' ? (
        <AccentBar disabled={false} onInsert={(symbol) => insertSymbol(inputRef, symbol)} />
      ) : null}
      {speakStep && phase === 'ask' ? null : (
        <View style={[styles.footer, { paddingBottom }]}>
          {phase === 'feedback' ? (
            <CompactFeedback
              correct={grade !== 'wrong'}
              title={t(grade === 'wrong' ? 'topicTest.wrong' : 'topicTest.correct')}
              answer={revealed}
            />
          ) : null}
          <Button
            title={t(phase === 'feedback' ? 'topicTest.next' : 'topicTest.check')}
            disabled={phase === 'ask' && !canCheck}
            onPress={phase === 'feedback' ? onNext : onCheck}
          />
        </View>
      )}
    </View>
  );
}

function insertSymbol(inputRef: Ref<AnswerTextFieldHandle>, symbol: string) {
  if (inputRef && typeof inputRef !== 'function') inputRef.current?.insertSymbol(symbol);
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
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    flex: 1,
  },
  speakDone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  center: {
    textAlign: 'center',
  },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
});
