import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { space } from '@/theme/tokens';

import type { TestSessionState } from '../hooks/useTestSession';
import type { StudySettings } from '../types';
import { SessionBar } from './SessionBar';
import { TestQuestionView } from './TestQuestion';

type TestQuizProps = {
  session: TestSessionState;
  onClose: () => void;
  settings?: StudySettings;
  onChangeSettings?: (settings: StudySettings) => void;
};

export function TestQuiz({ session, onClose, settings, onChangeSettings }: TestQuizProps) {
  const { t } = useTranslation();
  const question = session.question;
  if (!question) return null;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SessionBar
        current={session.index + 1}
        total={session.questions.length}
        onClose={onClose}
        onPrevious={session.index > 0 ? session.goBack : undefined}
        settings={settings}
        onChangeSettings={onChangeSettings}
      />
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
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: space.lg,
  },
});
