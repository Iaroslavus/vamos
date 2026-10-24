import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius, space, type } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type TopicSearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function TopicSearchField({ value, onChangeText }: TopicSearchFieldProps) {
  const { t } = useTranslation();
  const label = t('topics.searchLabel');

  return (
    <View style={styles.field}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Search color={colors.inkMuted} size={20} strokeWidth={ICON_STROKE} />
      </View>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('topics.searchPlaceholder')}
        placeholderTextColor={colors.inkDisabled}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('topics.clearSearch')}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <X color={colors.ink} size={18} strokeWidth={ICON_STROKE} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: type.body.fontSize,
    paddingVertical: space.sm,
  },
  clear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
