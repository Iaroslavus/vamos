import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { UI_LANGUAGE_LABELS, UI_LANGUAGES, type UiLanguage } from '@/i18n/language';
import { colors, radius, space } from '@/theme/tokens';

import { useUiLanguage } from './useUiLanguage';

type LanguageOptionsProps = {
  variant?: 'list' | 'switch';
};

export function LanguageOptions({ variant = 'list' }: LanguageOptionsProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useUiLanguage();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.languageTitle')}
      style={variant === 'switch' ? styles.switchRow : styles.list}
    >
      {UI_LANGUAGES.map((code) => (
        <LanguageOption
          key={code}
          code={code}
          selected={code === language}
          variant={variant}
          onPress={() => setLanguage(code)}
        />
      ))}
    </View>
  );
}

type LanguageOptionProps = {
  code: UiLanguage;
  selected: boolean;
  variant: 'list' | 'switch';
  onPress: () => void;
};

function LanguageOption({ code, selected, variant, onPress }: LanguageOptionProps) {
  const { t } = useTranslation();
  const name = UI_LANGUAGE_LABELS[code];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={selected ? t('settings.languageSelected', { language: name }) : name}
      onPress={onPress}
      style={({ pressed }) => [
        variant === 'switch' ? styles.chip : styles.row,
        selected ? (variant === 'switch' ? styles.chipSelected : styles.rowSelected) : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        variant="bodyBold"
        color={variant === 'switch' && selected ? colors.inkOnDark : colors.ink}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {name}
      </Text>
      {variant === 'list' && selected ? (
        <Check color={colors.teal} size={22} strokeWidth={2.6} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  switchRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  chip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  pressed: {
    opacity: 0.7,
  },
});
