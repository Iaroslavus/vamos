import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { SPANISH_QUICK_SYMBOLS } from '../textInput';

type AccentBarProps = {
  disabled?: boolean;
  onInsert: (symbol: string) => void;
};

export function AccentBar({ disabled = false, onInsert }: AccentBarProps) {
  return (
    <View style={styles.wrap} accessibilityRole="toolbar">
      <ScrollView
        horizontal
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {SPANISH_QUICK_SYMBOLS.map((symbol) => (
          <Pressable
            key={symbol}
            disabled={disabled}
            onPress={() => onInsert(symbol)}
            accessibilityRole="button"
            accessibilityLabel={symbol}
            style={({ pressed }) => [
              styles.key,
              disabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="bodyBold" color={colors.ink}>
              {symbol}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: space.sm,
  },
  row: {
    paddingHorizontal: space.md,
    gap: space.sm,
    alignItems: 'center',
  },
  key: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    backgroundColor: colors.saffronSoft,
  },
});
