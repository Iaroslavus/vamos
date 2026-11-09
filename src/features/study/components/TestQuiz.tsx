import { ChevronLeft, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { TestSessionState } from '../hooks/useTestSession';
import { TestQuestionView } from './TestQuestion';

type TestQuizProps = {
  session: TestSessionState;
  onClose: () => void;
};

export function TestQuiz({ session, onClose }: TestQuizProps) {
  const { t } = useTranslation();
  const question = session.question;
  if (!question) return null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
        <View style={styles.progress}>
          <ProgressBar
            progress={session.index / session.questions.length}
            accessibilityLabel={t('study.progress', {
              done: session.index,
              total: session.questions.length,
            })}
          />
        </View>
        {session.index > 0 ? (
          <IconButton accessibilityLabel={t('study.test.previous')} onPress={session.goBack}>
            <ChevronLeft size={22} color={colors.ink} strokeWidth={2.2} />
          </IconButton>
        ) : (
          <View style={styles.headerGap} />
        )}
      </View>
      <Text variant="bodyBold" style={styles.center} testID="test-counter">
        {t('study.test.counter', { current: session.index + 1, total: session.questions.length })}
      </Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TestQuestionView
          key={question.id}
          question={question}
          answer={session.answer}
          onAnswer={session.setAnswer}
        />
      </ScrollView>
      <Button
        title={t(session.last ? 'study.test.submit' : 'study.test.next')}
        disabled={session.busy}
        onPress={session.goNext}
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
  progress: {
    flex: 1,
  },
  headerGap: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
