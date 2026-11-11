import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { useAdvancedRatingStore } from './advancedRatingStore';

export function AdvancedRatingSetting() {
  const { t } = useTranslation();
  const enabled = useAdvancedRatingStore((state) => state.enabled);
  const setEnabled = useAdvancedRatingStore((state) => state.setEnabled);

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text variant="bodyBold">{t('settings.advancedRating')}</Text>
        <Text variant="caption" color={colors.inkMuted}>
          {t('settings.advancedRatingHint')}
        </Text>
      </View>
      <Switch
        accessibilityLabel={t('settings.advancedRating')}
        value={enabled}
        onValueChange={setEnabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        trackColor={{ false: colors.borderStrong, true: colors.teal }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
});
