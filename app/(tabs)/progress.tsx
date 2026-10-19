import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { StubScreen } from '@/components/StubScreen';
import { Text } from '@/components/Text';
import { useProgress } from '@/features/progress/useProgress';
import { colors } from '@/theme/tokens';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { data } = useProgress();
  const hasProgress = Boolean(
    data && (data.lessons.length > 0 || data.totalXp > 0 || data.pending > 0),
  );

  return (
    <StubScreen
      title={t('progress.title')}
      description={
        hasProgress
          ? t('progress.summary', { lessons: data?.lessons.length ?? 0, xp: data?.totalXp ?? 0 })
          : t('progress.stub')
      }
    >
      {data && data.pending > 0 ? (
        <Text variant="body" color={colors.inkMuted} style={styles.pending}>
          {t('progress.pending', { count: data.pending })}
        </Text>
      ) : null}
    </StubScreen>
  );
}

const styles = StyleSheet.create({
  pending: {
    textAlign: 'center',
  },
});
