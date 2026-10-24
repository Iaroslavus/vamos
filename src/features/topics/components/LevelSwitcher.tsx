import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import type { CefrLevel } from '@/features/content/schema';
import { CEFR_LEVELS } from '@/features/topics/catalog';
import { colors, radius, space } from '@/theme/tokens';

type LevelSwitcherProps = {
  level: CefrLevel;
  hasContent: (level: CefrLevel) => boolean;
  onChange: (level: CefrLevel) => void;
};

export function LevelSwitcher({ level, hasContent, onChange }: LevelSwitcherProps) {
  const { t } = useTranslation();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('topics.levelGroup')}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CEFR_LEVELS.map((item) => {
          const selected = item === level;
          const empty = !hasContent(item);
          const label = empty
            ? t('topics.levelSoon', { level: item })
            : t('topics.levelLabel', { level: item });

          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected }}
              onPress={() => {
                if (item === level) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(item);
              }}
              style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
            >
              <Text variant="bodyBold" color={selected ? colors.inkOnDark : colors.ink}>
                {item}
              </Text>
              {empty ? (
                <Text variant="caption" color={selected ? colors.inkOnDark : colors.inkMuted}>
                  {t('topics.soonShort')}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
    paddingHorizontal: space.xl,
  },
  chip: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  chipIdle: {
    backgroundColor: colors.surface,
  },
});
