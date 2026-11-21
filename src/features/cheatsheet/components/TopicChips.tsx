import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

export type TopicChipModel = {
  id: string;
  label: string;
  selected: boolean;
};

type TopicChipsProps = {
  chips: readonly TopicChipModel[];
  onPress: (id: string) => void;
};

export function TopicChips({ chips, onPress }: TopicChipsProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {chips.map((chip) => (
          <Pressable
            key={chip.id}
            accessibilityRole="button"
            accessibilityLabel={chip.label}
            accessibilityState={{ selected: chip.selected }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress(chip.id);
            }}
            style={[styles.chip, chip.selected ? styles.selected : null]}
          >
            <Text variant="bodyBold" color={chip.selected ? colors.coral : colors.ink}>
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
    flexShrink: 0,
  },
  scroller: {
    flexGrow: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  chip: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.coral,
  },
});
