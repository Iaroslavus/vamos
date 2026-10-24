import { Mic, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type TodayActionsProps = {
  reviewCount: number;
  onReview: () => void;
  onSpeak: () => void;
};

export function TodayActions({ reviewCount, onReview, onSpeak }: TodayActionsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('today.review', { count: reviewCount })}
        onPress={onReview}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <RotateCcw color={colors.coral} size={22} strokeWidth={ICON_STROKE} />
        <Text variant="bodyBold">{t('today.review', { count: reviewCount })}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('today.speak')}
        onPress={onSpeak}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <Mic color={colors.teal} size={22} strokeWidth={ICON_STROKE} />
        <Text variant="bodyBold">{t('today.speak')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  card: {
    flex: 1,
    minHeight: 88,
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});
