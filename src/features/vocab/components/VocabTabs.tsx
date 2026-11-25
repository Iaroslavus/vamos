import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

export type VocabTab = 'folders' | 'phrasebook';

type VocabTabsProps = {
  tab: VocabTab;
  onChange: (tab: VocabTab) => void;
};

export function VocabTabs({ tab, onChange }: VocabTabsProps) {
  const { t } = useTranslation();
  const tabs: { id: VocabTab; label: string }[] = [
    { id: 'folders', label: t('vocab.tabFolders') },
    { id: 'phrasebook', label: t('vocab.tabPhrasebook') },
  ];

  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {tabs.map((entry) => {
        const selected = entry.id === tab;
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="tab"
            accessibilityLabel={entry.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(entry.id);
            }}
            style={[styles.tab, selected ? styles.selected : null]}
          >
            <Text variant="bodyBold" color={selected ? colors.coral : colors.inkMuted}>
              {entry.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.lg,
    paddingHorizontal: space.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: space.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.ground,
  },
  selected: {
    borderBottomColor: colors.coral,
  },
});
