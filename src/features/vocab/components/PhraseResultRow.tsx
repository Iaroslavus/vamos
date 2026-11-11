import { Check, Plus, Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
import { colors, radius, space } from '@/theme/tokens';

type PhraseResultRowProps = {
  id: string;
  es: string;
  translation: string;
  added: boolean;
  onToggle: () => void;
  onPlay: () => void;
};

export function PhraseResultRow({
  id,
  es,
  translation,
  added,
  onToggle,
  onPlay,
}: PhraseResultRowProps) {
  const { t } = useTranslation();
  const shownEs = displayText(es);
  const shownTranslation = displayText(translation);

  return (
    <View style={styles.result}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(added ? 'folder.removePhrase' : 'folder.addPhrase', { es: shownEs })}
        accessibilityState={{ selected: added }}
        onPress={onToggle}
        style={styles.main}
      >
        <View style={styles.copy}>
          <Text variant="bodyBold">{shownEs}</Text>
          {shownTranslation ? (
            <Text variant="caption" color={colors.inkMuted}>
              {shownTranslation}
            </Text>
          ) : null}
        </View>
        {added ? (
          <Check testID={`phrase-check-${id}`} color={colors.teal} size={22} strokeWidth={2.2} />
        ) : (
          <Plus color={colors.coral} size={22} strokeWidth={2.2} />
        )}
      </Pressable>
      <IconButton accessibilityLabel={t('vocab.play', { es: shownEs })} onPress={onPlay}>
        <Volume2 color={colors.blue} size={22} strokeWidth={2.2} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  result: {
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
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
  },
  copy: {
    flex: 1,
    gap: space.xs,
  },
});
