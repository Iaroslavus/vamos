import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import { useTestSession } from '../hooks/useTestSession';
import type { StudyRecordInput } from '../hooks/useStudyPlayer';
import type { StudyUnit, TestSettings } from '../types';
import { TestQuiz } from './TestQuiz';
import { TestResultView } from './TestResult';
import { TestSetup } from './TestSetup';

type TestSessionProps = {
  units: readonly StudyUnit[];
  settings: TestSettings;
  onChangeSettings: (settings: TestSettings) => void;
  onRecord: (record: StudyRecordInput) => Promise<void>;
  onAddDifficult: (itemIds: readonly string[]) => Promise<void>;
  onClose: () => void;
};

export function TestSession({
  units,
  settings,
  onChangeSettings,
  onRecord,
  onAddDifficult,
  onClose,
}: TestSessionProps) {
  const session = useTestSession({ units, settings, onChangeSettings, onRecord, onAddDifficult });

  if (session.phase === 'setup') {
    return (
      <View style={styles.root}>
        <CloseHeader onClose={onClose} />
        <TestSetup
          units={units}
          settings={session.draft}
          onChange={session.changeDraft}
          onStart={session.start}
        />
      </View>
    );
  }

  if (session.phase === 'result' && session.score) {
    return (
      <View style={styles.root}>
        <CloseHeader onClose={onClose} />
        <TestResultView
          score={session.score}
          canRepeat={session.canRepeat}
          adding={session.adding}
          added={session.added}
          addError={session.addError}
          rateError={session.rateError}
          onRepeat={session.repeat}
          onAdd={session.add}
          onClose={onClose}
        />
      </View>
    );
  }

  if (!session.question) {
    return <EmptyTest onClose={onClose} />;
  }

  return <TestQuiz session={session} onClose={onClose} />;
}

function CloseHeader({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
        <X size={22} color={colors.ink} strokeWidth={2.2} />
      </IconButton>
    </View>
  );
}

function EmptyTest({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.root}>
      <CloseHeader onClose={onClose} />
      <Text variant="body" color={colors.inkMuted} style={styles.center}>
        {t('study.test.tooFew')}
      </Text>
      <Button title={t('study.backToFolder')} onPress={onClose} />
    </View>
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
  },
  center: {
    textAlign: 'center',
  },
});
