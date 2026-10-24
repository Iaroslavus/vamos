import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import type { CanDoState } from '@/features/topics/catalog';
import { colors, motion, radius, space } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type CanDoListProps = {
  items: readonly CanDoState[];
};

export function CanDoList({ items }: CanDoListProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text variant="h3" accessibilityRole="header">
        {t('topics.canDoTitle')}
      </Text>
      {items.map((item, index) => (
        <Appear key={`${index}-${item.text}`} delay={Math.min(index, 8) * motion.stagger}>
          <View
            accessible
            accessibilityLabel={
              item.done
                ? t('topics.canDoDone', { goal: item.text })
                : t('topics.canDoOpen', { goal: item.text })
            }
            style={styles.row}
          >
            <View style={[styles.mark, item.done ? styles.markDone : null]}>
              {item.done ? <Check color={colors.teal} size={16} strokeWidth={ICON_STROKE} /> : null}
            </View>
            <Text
              variant="body"
              color={item.done ? colors.ink : colors.inkMuted}
              style={styles.goal}
            >
              {item.text}
            </Text>
          </View>
        </Appear>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDone: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  goal: {
    flex: 1,
  },
});
