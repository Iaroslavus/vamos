import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { usePhraseBreakdownStore } from './phraseBreakdownStore';

export function PhraseBreakdownSetting() {
  const { t } = useTranslation();
  const show = usePhraseBreakdownStore((state) => state.show);
  const setShow = usePhraseBreakdownStore((state) => state.setShow);

  return (
    <View style={styles.row}>
      <Text variant="bodyBold" style={styles.label}>
        {t('profile.showPhraseBreakdown')}
      </Text>
      <Switch
        accessibilityLabel={t('profile.showPhraseBreakdown')}
        value={show}
        onValueChange={setShow}
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
  label: {
    flex: 1,
  },
});
