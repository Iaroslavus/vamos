import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import type { CheatsheetToast as ToastModel } from '../hooks/useSaveTopicPhrases';

type CheatsheetToastProps = {
  toast: ToastModel;
  bottom: number;
  onDismiss: () => void;
};

export function CheatsheetToast({ toast, bottom, onDismiss }: CheatsheetToastProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss, toast]);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toast, { bottom }]}
    >
      <Text variant="bodyBold" color={colors.inkOnDark} style={styles.message}>
        {toast.message}
      </Text>
      {toast.undo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cheatsheet.undo')}
          onPress={() => {
            const undo = toast.undo;
            onDismiss();
            if (undo) void undo();
          }}
          style={styles.undo}
        >
          <Text variant="bodyBold" color={colors.saffron}>
            {t('cheatsheet.undo')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    zIndex: 30,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.sm,
  },
  message: {
    textAlign: 'center',
  },
  undo: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
