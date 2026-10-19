import { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, TextInput, type NativeSyntheticEvent } from 'react-native';

import { colors, fonts, radius, space } from '@/theme/tokens';

import { insertAtSelection, type TextSelection } from '../textInput';

export type AnswerTextFieldHandle = {
  insertSymbol: (symbol: string) => void;
};

type AnswerTextFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
};

export const AnswerTextField = forwardRef<AnswerTextFieldHandle, AnswerTextFieldProps>(
  function AnswerTextField(
    { value, onChangeText, placeholder, disabled = false, autoFocus = false, accessibilityLabel },
    ref,
  ) {
    const [selection, setSelection] = useState<TextSelection>({
      start: value.length,
      end: value.length,
    });

    useImperativeHandle(
      ref,
      () => ({
        insertSymbol: (symbol: string) => {
          if (disabled) return;
          const next = insertAtSelection(value, selection, symbol);
          onChangeText(next.value);
          setSelection(next.selection);
        },
      }),
      [disabled, onChangeText, selection, value],
    );

    const onSelectionChange = (event: NativeSyntheticEvent<{ selection: TextSelection }>) => {
      setSelection(event.nativeEvent.selection);
    };

    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={onSelectionChange}
        selection={selection}
        editable={!disabled}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={colors.inkDisabled}
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, disabled && styles.inputDisabled]}
      />
    );
  },
);

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
  },
  inputDisabled: {
    opacity: 0.6,
  },
});
