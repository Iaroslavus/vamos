import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  editable?: boolean;
};

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  textContentType,
  autoComplete,
  maxLength,
  editable = true,
}: AuthFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="bodyBold">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkDisabled}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        textContentType={textContentType}
        autoComplete={autoComplete}
        maxLength={maxLength}
        editable={editable}
        style={[styles.input, !editable ? styles.inputDisabled : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: type.body.fontSize,
  },
  inputDisabled: {
    color: colors.inkMuted,
  },
});
