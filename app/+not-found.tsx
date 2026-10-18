import { Link, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('common.notFoundTitle') }} />
      <View style={styles.container}>
        <Text variant="h3">{t('common.notFoundTitle')}</Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text variant="bodyBold" color={colors.coral}>
            {t('common.notFoundLink')}
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.md,
    backgroundColor: colors.ground,
  },
  link: {
    marginTop: space.md,
    paddingVertical: space.md,
  },
});
