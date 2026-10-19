import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { currentLevel, levelRatio, type LevelProgress } from '@/features/path/curriculum';

type LevelListProps = {
  levels: readonly LevelProgress[];
};

export function LevelList({ levels }: LevelListProps) {
  const { t } = useTranslation();
  const active = currentLevel(levels);

  return (
    <View style={styles.card}>
      <Text variant="h3" accessibilityRole="header">
        {t('progress.levelsTitle')}
      </Text>
      {levels.map((row) => {
        const open = row.total > 0;
        const count = open
          ? t('progress.levelCount', { done: row.completed, total: row.total })
          : t('progress.levelSoon');
        const label = open
          ? t('progress.levelLabel', { level: row.level, done: row.completed, total: row.total })
          : t('progress.levelSoonLabel', { level: row.level });

        return (
          <View key={row.level} style={styles.level}>
            <View style={styles.head}>
              <Text variant="bodyBold">{row.level}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {count}
              </Text>
            </View>
            <ProgressBar
              progress={levelRatio(row)}
              color={row.level === active ? colors.coral : colors.teal}
              accessibilityLabel={label}
            />
          </View>
        );
      })}
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
  level: {
    gap: space.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
});
