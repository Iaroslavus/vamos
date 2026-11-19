import { StatusBar } from 'expo-status-bar';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
import { colors, space } from '@/theme/tokens';

const ICON_STROKE = 2.2;

type PhraseCardProps = {
  phrase: string;
  translation: string;
  onListen: () => void;
  onClose: () => void;
};

export function PhraseCard({ phrase, translation, onListen, onClose }: PhraseCardProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const shownPhrase = displayText(phrase);
  const shownTranslation = displayText(translation);
  const edge = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX(16)
      .failOffsetY([-24, 24])
      .onEnd((event) => {
        if (event.translationX > 72) runOnJS(onClose)();
      });
    return pan;
  }, [onClose]);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StayAwake />
      <StatusBar style="light" />
      <View
        accessibilityViewIsModal
        style={[
          styles.card,
          { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg },
        ]}
      >
        <GestureDetector gesture={edge}>
          <View style={styles.edge} />
        </GestureDetector>
        <View style={styles.top}>
          <IconButton
            accessibilityLabel={t('cheatsheet.close')}
            onPress={onClose}
            style={styles.close}
          >
            <X color={colors.inkOnDark} size={22} strokeWidth={ICON_STROKE} />
          </IconButton>
        </View>
        <View style={styles.copy}>
          <Text variant="display" color={colors.inkOnDark} style={styles.phrase}>
            {shownPhrase}
          </Text>
          {shownTranslation ? (
            <Text variant="body" color={colors.inkOnDarkMuted} style={styles.translation}>
              {shownTranslation}
            </Text>
          ) : null}
        </View>
        <Button
          title={t('cheatsheet.listen')}
          accessibilityLabel={t('cheatsheet.listenPhrase', { phrase: shownPhrase })}
          onPress={onListen}
        />
      </View>
    </Modal>
  );
}

function StayAwake() {
  const [keep, setKeep] = useState<typeof import('expo-keep-awake') | null>(null);

  useEffect(() => {
    let live = true;
    void import('expo-keep-awake')
      .then((mod) => {
        if (live) setKeep(mod);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!keep) return null;
  return <Awake keep={keep} />;
}

function Awake({ keep }: { keep: typeof import('expo-keep-awake') }) {
  const { useKeepAwake } = keep;
  useKeepAwake('cheatsheet-card');
  return null;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingHorizontal: space.xl,
  },
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 2,
  },
  top: {
    alignItems: 'flex-end',
  },
  close: {
    backgroundColor: colors.ink,
    borderColor: colors.inkOnDarkMuted,
  },
  copy: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  phrase: {
    textAlign: 'center',
  },
  translation: {
    textAlign: 'center',
  },
});
