import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { AdvancedRatingSetting } from '@/features/settings/AdvancedRatingSetting';
import { LanguageOptions } from '@/features/settings/LanguageOptions';
import { colors, space } from '@/theme/tokens';

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="h3" accessibilityRole="header">
        {t('settings.languageTitle')}
      </Text>
      <LanguageOptions />
      <AdvancedRatingSetting />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    backgroundColor: colors.ground,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
});
