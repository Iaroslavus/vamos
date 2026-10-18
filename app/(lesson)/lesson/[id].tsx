import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { StubScreen } from '@/components/StubScreen';
import { Text } from '@/components/Text';
import { colors } from '@/theme/tokens';

export default function LessonScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <StubScreen title={t('lesson.title')} description={t('lesson.stub')}>
      <Text variant="caption" color={colors.inkMuted} style={styles.id}>
        {id}
      </Text>
    </StubScreen>
  );
}

const styles = StyleSheet.create({
  id: {
    textAlign: 'center',
  },
});
