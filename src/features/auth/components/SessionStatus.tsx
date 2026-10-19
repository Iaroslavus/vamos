import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useSession } from '@/features/auth/useSession';
import { colors, space } from '@/theme/tokens';

import { ErrorNote } from './ErrorNote';

export function SessionLoading() {
  const { t } = useTranslation();

  return (
    <View
      style={styles.screen}
      accessibilityRole="progressbar"
      accessibilityLabel={t('auth.loading')}
    >
      <ActivityIndicator color={colors.coral} size="large" />
      <Text color={colors.inkMuted}>{t('auth.loading')}</Text>
    </View>
  );
}

export function SessionError() {
  const { t } = useTranslation();
  const { error, retry } = useSession();

  return (
    <View style={styles.screen}>
      <Text variant="h2" style={styles.center}>
        {t('auth.bootstrapTitle')}
      </Text>
      <Text color={colors.inkMuted} style={styles.center}>
        {t('auth.bootstrapBody')}
      </Text>
      {error ? <ErrorNote message={t(`auth.errors.${error}`)} /> : null}
      <Button
        title={t('auth.retry')}
        onPress={() => {
          void retry();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  center: {
    textAlign: 'center',
  },
});
