import type { RefObject } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { AudioControls } from '@/features/audio/AudioControls';
import type { AnswerTextFieldHandle } from '@/features/lesson/components/AnswerTextField';
import { AnswerTextField } from '@/features/lesson/components/AnswerTextField';
import { space } from '@/theme/tokens';

type DictationPromptProps = {
  prompt: string;
  phrase: string;
  audio: string | null;
  mask: string;
  maskLabel: string;
  value: string;
  placeholder: string;
  revealTitle: string;
  revealLabel: string;
  disabled: boolean;
  revealDisabled: boolean;
  inputRef: RefObject<AnswerTextFieldHandle | null>;
  onChangeText: (value: string) => void;
  onReveal: () => void;
};

export function DictationPrompt({
  prompt,
  phrase,
  audio,
  mask,
  maskLabel,
  value,
  placeholder,
  revealTitle,
  revealLabel,
  disabled,
  revealDisabled,
  inputRef,
  onChangeText,
  onReveal,
}: DictationPromptProps) {
  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="h3">{prompt}</Text>
      <AudioControls text={phrase} audio={audio} disabled={disabled} />
      <Text variant="body" accessibilityLabel={maskLabel}>
        {mask}
      </Text>
      <AnswerTextField
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
        accessibilityLabel={prompt}
      />
      <Button
        title={revealTitle}
        variant="secondary"
        disabled={revealDisabled}
        accessibilityLabel={revealLabel}
        onPress={onReveal}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: space.lg,
    paddingBottom: space.lg,
  },
});
