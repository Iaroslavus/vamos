import * as Haptics from 'expo-haptics';
import { Square } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { displayEs, displayText } from '@/features/content/displayText';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, radius, space } from '@/theme/tokens';

import { PhraseWave } from './PhraseWave';

const ICON_STROKE = 2.2;

type PhraseRowProps = {
  phrase: string;
  translation: string;
  playing: boolean;
  onPlay: () => void;
  onShow: () => void;
};

export function PhraseRow({ phrase, translation, playing, onPlay, onShow }: PhraseRowProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const shownPhrase = displayEs(phrase);
  const shownTranslation = displayText(translation);

  return (
    <View style={[styles.row, playing ? styles.playing : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cheatsheet.listenPhrase', { phrase: shownPhrase })}
        accessibilityState={{ selected: playing }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPlay();
        }}
        style={styles.main}
      >
        <View style={styles.copy}>
          <Text variant="bodyBold">{shownPhrase}</Text>
          {shownTranslation ? (
            <Text variant="caption" color={colors.inkMuted}>
              {shownTranslation}
            </Text>
          ) : null}
        </View>
        {playing ? <PhraseWave reduceMotion={reduceMotion} /> : null}
      </Pressable>
      <IconButton
        accessibilityLabel={t('cheatsheet.showLarge', { phrase: shownPhrase })}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onShow();
        }}
      >
        <Square color={colors.ink} size={20} strokeWidth={ICON_STROKE} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  playing: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.blue,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingVertical: space.sm,
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
});
